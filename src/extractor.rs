use crate::cli::Cli;
use crate::oodle::Oodle;
use chrono::NaiveDate;
use crc32fast::Hasher;
use filetime::{FileTime, set_file_mtime};
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use regex::Regex;
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use zip::ZipArchive;

pub struct Extractor {
    oodle: Arc<Oodle>,
    since: NaiveDate,
    extensions: Option<Regex>,
    excludes: Option<Regex>,
    folders: Option<Regex>,
    regex: Option<Regex>,
    skip: bool,
    crc: bool,
    output: PathBuf,
    mp: Arc<MultiProgress>,
}

impl Extractor {
    pub fn new(cli: &Cli, oodle: Arc<Oodle>, mp: Arc<MultiProgress>) -> anyhow::Result<Self> {
        let since = NaiveDate::parse_from_str(&cli.since, "%Y-%m-%d")
            .unwrap_or_else(|_| NaiveDate::from_ymd_opt(2019, 11, 1).unwrap());
        let output = cli.output.clone();

        let extensions = cli.build_extensions();
        let extensions = if !extensions.is_empty() {
            let pattern = format!(r"(?i)\.({})$", extensions.join("|").replace(".", ""));
            Some(Regex::new(&pattern)?)
        } else {
            None
        };

        let excludes = if !cli.exclude.is_empty() {
            let pattern = format!(r"(?i)\.({})$", cli.exclude.join("|").replace(".", ""));
            Some(Regex::new(&pattern)?)
        } else {
            None
        };

        let folders = if !cli.folders.is_empty() {
            let pattern = format!(r"(?i)^{}.*", cli.folders.join("|").replace("\\", "/"));
            Some(Regex::new(&pattern)?)
        } else {
            None
        };

        let regex = if let Some(ref r) = cli.regex {
            Some(Regex::new(&format!("(?i){}", r))?)
        } else {
            None
        };

        Ok(Self {
            oodle,
            since,
            extensions,
            excludes,
            folders,
            regex,
            skip: cli.skip,
            crc: cli.crc,
            output,
            mp,
        })
    }

    pub fn process_pak(&self, pak_path: &Path) -> anyhow::Result<()> {
        let file = File::open(pak_path)?;
        let mut archive = ZipArchive::new(file)?;

        let pb = self.mp.add(ProgressBar::new(archive.len() as u64));
        pb.set_style(ProgressStyle::default_bar()
            .template("Progress: [{bar:40.cyan/blue}] {percent}% | {pos}/{len} | Extracted: {msg} | {prefix}")?
            .progress_chars("=> "));
        pb.set_prefix(
            pak_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .into_owned(),
        );

        let mut extracted_count = 0;

        for i in 0..archive.len() {
            let entry = archive.by_index_raw(i)?;
            let name = entry.name().to_string();
            let is_dir = name.ends_with('/');
            let entry_size = entry.size();
            let entry_crc = entry.crc32();
            let entry_method = entry.compression();
            let last_mod = entry.last_modified();

            pb.set_message(format!("{}", extracted_count));
            pb.inc(1);

            if is_dir {
                continue;
            }

            let mod_date = if let Some(last_mod) = last_mod {
                NaiveDate::from_ymd_opt(
                    last_mod.year() as i32,
                    last_mod.month() as u32,
                    last_mod.day() as u32,
                ).unwrap_or_else(|| NaiveDate::from_ymd_opt(1970, 1, 1).unwrap())
            } else {
                NaiveDate::from_ymd_opt(1970, 1, 1).unwrap()
            };

            if mod_date < self.since {
                continue;
            }

            if let Some(ref ex) = self.excludes {
                if ex.is_match(&name) {
                    continue;
                }
            }

            if let Some(ref ext) = self.extensions {
                if !ext.is_match(&name) {
                    continue;
                }
            }

            if let Some(ref f) = self.folders {
                if !f.is_match(&name) {
                    continue;
                }
            }

            if let Some(ref r) = self.regex {
                if !r.is_match(&name) {
                    continue;
                }
            }

            let out_path = self.output.join(&name);

            if self.skip && out_path.exists() {
                if let Ok(meta) = fs::metadata(&out_path) {
                    if meta.len() == entry_size {
                        continue;
                    }
                }
            }

            if self.crc && out_path.exists() {
                if let Ok(data) = fs::read(&out_path) {
                    let mut hasher = Hasher::new();
                    hasher.update(&data);
                    if hasher.finalize() == entry_crc {
                        continue;
                    }
                }
            }

            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)?;
            }

            let compressed_size = entry.compressed_size() as usize;
            drop(entry); // Drop the raw entry so we can re-borrow archive

            if entry_method == zip::CompressionMethod::Stored
                || entry_method == zip::CompressionMethod::Deflated
            {
                if let Ok(mut decomp_entry) = archive.by_index(i) {
                    if let Ok(mut out_file) = File::create(&out_path) {
                        let _ = io::copy(&mut decomp_entry, &mut out_file);
                    }
                }
            } else if { #[allow(deprecated)] let is_15 = entry_method.to_u16() == 15; is_15 } {
                if let Ok(mut raw_entry) = archive.by_index_raw(i) {
                    let mut comp_data = Vec::with_capacity(compressed_size);
                    if raw_entry.read_to_end(&mut comp_data).is_ok() {
                        if let Some(decomp_data) = self.oodle.decompress(&comp_data, entry_size as usize) {
                            if let Ok(mut out_file) = File::create(&out_path) {
                                let _ = out_file.write_all(&decomp_data);
                            }
                        } else {
                            eprintln!("Failed to decompress {}", name);
                        }
                    }
                }
            } else {
                eprintln!(
                    "Unknown compression method {} for {}",
                    { #[allow(deprecated)] let meth = entry_method.to_u16(); meth },
                    name
                );
            }

            // Set file mod time
            if let Some(last_mod) = last_mod {
                use chrono::{TimeZone, Utc};
                if let chrono::LocalResult::Single(dt) = Utc.with_ymd_and_hms(
                    last_mod.year() as i32,
                    last_mod.month() as u32,
                    last_mod.day() as u32,
                    last_mod.hour() as u32,
                    last_mod.minute() as u32,
                    last_mod.second() as u32,
                ) {
                    let mtime = FileTime::from_unix_time(dt.timestamp(), 0);
                    let _ = set_file_mtime(&out_path, mtime);
                }
            }

            extracted_count += 1;
        }

        pb.finish_with_message(format!("{}", extracted_count));

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    // A mock Oodle struct just for tests that don't actually decompress
    // Note: We can't instantiate real Oodle without the DLL, so we test Extractor
    // regex compilation separately.
    
    fn create_test_cli() -> Cli {
        Cli {
            input: PathBuf::from("in"),
            output: PathBuf::from("out"),
            since: "2019-11-01".into(),
            extension: vec!["txt".into()],
            exclude: vec!["bak".into()],
            regex: Some("test_.*".into()),
            folders: vec!["data\\models".into(), "assets/textures".into()],
            dds: false,
            text: false,
            db: false,
            actionlist: false,
            localization: false,
            concurrent: None,
            single: false,
            skip: false,
            crc: false,
            debug: false,
        }
    }

    #[test]
    fn test_extractor_regex_compilation() {
        // Since Oodle::new() attempts to load DLL, which might fail on CI,
        // we only test the regex compilation using a helper or by bypassing Oodle.
        // But since Extractor::new takes Arc<Oodle>, we can just test the Regex logic
        // by manually extracting the building logic if needed, or by skipping full initialization.
        let cli = create_test_cli();
        
        let extensions = cli.build_extensions();
        let ext_pattern = format!(r"(?i)\.({})$", extensions.join("|").replace(".", ""));
        let ext_regex = Regex::new(&ext_pattern).unwrap();
        assert!(ext_regex.is_match("file.txt"));
        assert!(!ext_regex.is_match("file.png"));

        let excl_pattern = format!(r"(?i)\.({})$", cli.exclude.join("|").replace(".", ""));
        let excl_regex = Regex::new(&excl_pattern).unwrap();
        assert!(excl_regex.is_match("file.bak"));
        assert!(!excl_regex.is_match("file.txt"));

        let folder_pattern = format!(r"(?i)^{}.*", cli.folders.join("|").replace("\\", "/"));
        let folder_regex = Regex::new(&folder_pattern).unwrap();
        assert!(folder_regex.is_match("data/models/char.pak"));
        assert!(folder_regex.is_match("assets/textures/diffuse.dds"));
        assert!(!folder_regex.is_match("scripts/main.lua"));

        let r = Regex::new(&format!("(?i){}", cli.regex.unwrap())).unwrap();
        assert!(r.is_match("test_file.txt"));
        assert!(!r.is_match("prod_file.txt"));
    }
}
