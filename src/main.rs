mod cli;
mod extractor;
mod oodle;

use clap::Parser;
use cli::Cli;
use extractor::Extractor;
use indicatif::MultiProgress;
use oodle::Oodle;
use rayon::prelude::*;
use std::fs;
use std::sync::Arc;

fn main() -> anyhow::Result<()> {
    env_logger::init();
    let cli = Cli::parse();

    let oodle = Arc::new(Oodle::new().map_err(|e| {
        anyhow::anyhow!("Failed to load Oodle library. Make sure oo2core_9_win64.dll or liboodle-data-shared.so is in the current directory or OODLE_LIBRARY_PATH is set. Error: {}", e)
    })?);

    let mp = Arc::new(MultiProgress::new());
    let extractor = Extractor::new(&cli, oodle, mp)?;

    let mut pak_files = Vec::new();
    if cli.input.is_file() {
        pak_files.push(cli.input.clone());
    } else if cli.input.is_dir() {
        for entry in fs::read_dir(&cli.input)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext.to_string_lossy().to_lowercase() == "pak" {
                        pak_files.push(path);
                    }
                }
            }
        }
    } else {
        anyhow::bail!("Input path does not exist or is not a file/directory.");
    }

    if cli.debug {
        println!("{:#?}", cli);
        println!("{:#?}", pak_files);
    }

    if cli.single {
        for pak in pak_files {
            if let Err(e) = extractor.process_pak(&pak) {
                eprintln!("Error processing {:?}: {}", pak, e);
            }
        }
    } else {
        let max_concurrent = cli.concurrent.unwrap_or_else(|| {
            std::thread::available_parallelism()
                .map(|n| n.get() / 4)
                .unwrap_or(1)
                .max(1)
        });

        rayon::ThreadPoolBuilder::new()
            .num_threads(max_concurrent)
            .build_global()?;

        pak_files.par_iter().for_each(|pak| {
            if let Err(e) = extractor.process_pak(pak) {
                eprintln!("Error processing {:?}: {}", pak, e);
            }
        });
    }

    Ok(())
}
