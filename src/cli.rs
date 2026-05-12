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
