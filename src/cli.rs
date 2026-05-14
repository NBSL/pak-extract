use clap::Parser;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(name = "pak-extract")]
#[command(
    about = "Extracts files from *.pak archives. Currently does not support encrypted archives."
)]
pub struct Cli {
    #[arg(help = "Path to folder containing .pak or .pak file itself")]
    pub input: PathBuf,

    #[arg(help = "Path to output folder")]
    pub output: PathBuf,

    #[arg(
        short = 'd',
        long,
        help = "Format: YYYY-MM-DD",
        default_value = "2019-11-01"
    )]
    pub since: String,

    #[arg(
        short = 'e',
        long,
        help = "Find files with extension. Use comma separated string for multiple extensions.",
        value_delimiter = ','
    )]
    pub extension: Vec<String>,

    #[arg(
        short = 'x',
        long,
        help = "File extensions to ignore.",
        value_delimiter = ','
    )]
    pub exclude: Vec<String>,

    #[arg(
        short = 'r',
        long,
        help = "Find files that match the regular expression value."
    )]
    pub regex: Option<String>,

    #[arg(short = 'f', long, help = "Folders to extract.", value_delimiter = ',')]
    pub folders: Vec<String>,

    #[arg(short = 'i', long, help = "Find all dds and dds.# files.")]
    pub dds: bool,

    #[arg(short = 't', long, help = "Find all xml and json files.")]
    pub text: bool,

    #[arg(long = "db", help = "Find all files that match .<word>db")]
    pub db: bool,

    #[arg(short = 'a', long, help = "Find all files that match .actionlist")]
    pub actionlist: bool,

    #[arg(short = 'l', long, help = "localization XML files")]
    pub localization: bool,

    #[arg(
        short = 'm',
        long,
        help = "Sets the maximum number of archives to extract at a time."
    )]
    pub concurrent: Option<usize>,

    #[arg(long, help = "Extracts the archives one at a time.")]
    pub single: bool,

    #[arg(long, help = "Skip files that already exist in the output directory")]
    pub skip: bool,

    #[arg(
        long,
        help = "Skip files that having matching CRC32 values in the output directory."
    )]
    pub crc: bool,

    #[arg(long, help = "Prints debug information.")]
    pub debug: bool,
}

impl Cli {
    pub fn build_extensions(&self) -> Vec<String> {
        let mut ext = self.extension.clone();
        if self.dds {
            ext.extend(vec![
                "dds.*".into(),
                "jpg".into(),
                "jpeg".into(),
                "png".into(),
                "tif".into(),
            ]);
        }
        if self.text {
            ext.extend(vec![
                "json".into(),
                "xml".into(),
                "txt".into(),
                "cfg".into(),
            ]);
        }
        if self.db {
            ext.push("w+db".into());
        }
        if self.actionlist {
            ext.push("actionlist".into());
        }
        if self.localization {
            ext.push("localization".into());
        }
        ext
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use clap::Parser;

    fn base_cli() -> Cli {
        Cli {
            input: PathBuf::from("in"),
            output: PathBuf::from("out"),
            since: "2019-11-01".into(),
            extension: vec![],
            exclude: vec![],
            regex: None,
            folders: vec![],
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
    fn test_build_extensions_empty() {
        let cli = base_cli();
        let exts = cli.build_extensions();
        assert!(exts.is_empty());
    }

    #[test]
    fn test_build_extensions_flags() {
        let mut cli = base_cli();
        cli.extension = vec!["custom".into()];
        cli.dds = true;
        cli.text = true;
        cli.db = true;
        cli.actionlist = true;
        cli.localization = true;

        let exts = cli.build_extensions();
        
        let expected = vec![
            "custom",
            "dds.*", "jpg", "jpeg", "png", "tif",
            "json", "xml", "txt", "cfg",
            "w+db",
            "actionlist",
            "localization"
        ];
        
        assert_eq!(exts.len(), expected.len());
        for ext in expected {
            assert!(exts.contains(&ext.to_string()), "Missing {}", ext);
        }
    }

    #[test]
    fn test_cli_parsing_basic() {
        let args = vec!["pak-extract", "input_dir", "output_dir", "-e", "xml,json", "--single"];
        let cli = Cli::try_parse_from(args).unwrap();
        
        assert_eq!(cli.input, PathBuf::from("input_dir"));
        assert_eq!(cli.output, PathBuf::from("output_dir"));
        assert_eq!(cli.extension, vec!["xml".to_string(), "json".to_string()]);
        assert!(cli.single);
        assert!(!cli.debug);
    }

    #[test]
    fn test_cli_parsing_all_flags() {
        let args = vec![
            "pak-extract", 
            "in_dir", 
            "out_dir", 
            "--since", "2020-05-05",
            "-x", "bak,old",
            "-r", ".*_test",
            "-f", "data/models,data/textures",
            "-i",
            "-t",
            "--db",
            "-a",
            "-l",
            "-m", "8",
            "--skip",
            "--crc",
            "--debug"
        ];
        let cli = Cli::try_parse_from(args).unwrap();
        
        assert_eq!(cli.input, PathBuf::from("in_dir"));
        assert_eq!(cli.output, PathBuf::from("out_dir"));
        assert_eq!(cli.since, "2020-05-05");
        assert_eq!(cli.exclude, vec!["bak".to_string(), "old".to_string()]);
        assert_eq!(cli.regex.unwrap(), ".*_test");
        assert_eq!(cli.folders, vec!["data/models".to_string(), "data/textures".to_string()]);
        assert!(cli.dds);
        assert!(cli.text);
        assert!(cli.db);
        assert!(cli.actionlist);
        assert!(cli.localization);
        assert_eq!(cli.concurrent, Some(8));
        assert!(cli.skip);
        assert!(cli.crc);
        assert!(cli.debug);
        assert!(!cli.single); // not provided
    }

    #[test]
    fn test_cli_parsing_default_since() {
        let args = vec!["pak-extract", "in_dir", "out_dir"];
        let cli = Cli::try_parse_from(args).unwrap();
        assert_eq!(cli.since, "2019-11-01"); // The default date
    }
}
