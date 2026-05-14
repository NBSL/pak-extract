# Pak Extract (Rust Edition)

A blazingly fast concurrent pak extractor for Oodle compressed `.pak` archives, completely rewritten in Rust for safety and performance.

This tool will parse `.pak` archives (which are zip containers) and extract their contents, automatically handling compression methods `0` (Stored), `8` (Deflated), and `15` (Oodle Kraken).

## Prerequisites

1. **Rust / Cargo**: You need to have the Rust toolchain installed to build the project. Get it from [rustup.rs](https://rustup.rs/).
2. **Oodle Shared Library**: This tool dynamically loads the Oodle decompression library at runtime. You must have the corresponding library for your platform in the directory you run the app from, or specify its path via the `OODLE_LIBRARY_PATH` environment variable.
    - **Windows**: `oo2core_8_win64.dll`
    - **Linux**: `liblinoodle.so`

## Building

To build the optimized release binary, run:

```bash
cargo build --release
```

The resulting executable will be available at `target/release/pak-extract`.

## Usage

```bash
# Basic usage
cargo run --release -- <INPUT> <OUTPUT>

# Example
cargo run --release -- "/path/to/game/assets/" "/path/to/extracted/output/"

# Extract with specific filters
cargo run --release -- -e xml,json -i --since 2023-01-01 "/path/to/assets/" "./output"
```

## Command Line Arguments

```text
Usage: pak-extract [OPTIONS] <INPUT> <OUTPUT>

Arguments:
  <INPUT>   Path to folder containing .pak files, or a direct path to a single .pak file
  <OUTPUT>  Path to output folder

Options:
  -d, --since <SINCE>          Format: YYYY-MM-DD. Only extract files modified after this date [default: 2019-11-01]
  -e, --extension <EXTENSION>  Find files with extension. Use comma separated string for multiple extensions (e.g. -e xml,json)
  -x, --exclude <EXCLUDE>      File extensions to ignore
  -r, --regex <REGEX>          Find files that match the regular expression value
  -f, --folders <FOLDERS>      Folders to extract (comma separated)
  -i, --dds                    Find all dds and dds.# files (includes jpg, jpeg, png, tif)
  -t, --text                   Find all xml, json, txt, and cfg files
      --db                     Find all files that match .<word>db
  -a, --actionlist             Find all files that match .actionlist
  -l, --localization           Find localization XML files
  -m, --concurrent <CONCURRENT>  Sets the maximum number of archives to extract at a time. Defaults to a quarter of your CPU cores.
      --single                 Extracts the archives one at a time. Useful if running out of memory.
      --skip                   Skip files that already exist in the output directory (compares file size)
      --crc                    Skip files that have matching CRC32 values in the output directory
      --debug                  Prints debug information
  -h, --help                   Print help
```

## Performance Note
By default, the extractor uses the [Rayon](https://docs.rs/rayon) crate to process multiple `.pak` files concurrently in a thread pool. This drastically reduces total extraction time. If you experience memory issues or disk bottlenecking with many large archives, try limiting the concurrency using the `-m` flag or fallback to sequential extraction with the `--single` flag.
