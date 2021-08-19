# pak-extractor

Pak Extractor for Oodle compressed paks

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/nw-extractor.svg)](https://npmjs.org/package/nw-extractor)
[![Downloads/week](https://img.shields.io/npm/dw/nw-extractor.svg)](https://npmjs.org/package/nw-extractor)
[![License](https://img.shields.io/npm/l/nw-extractor.svg)](https://github.com/NBSL/nw-extractor/blob/master/package.json)

<!-- toc -->
* [pak-extractor](#pak-extractor)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g pak-extract
$ pak-extract COMMAND
running command...
$ pak-extract (-v|--version|version)
pak-extract/0.0.3 win32-x64 node-v14.15.1
$ pak-extract --help [COMMAND]
USAGE
  $ pak-extract COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`pak-extract extract [INPUT] [OUTPUT]`](#pak-extract-extract-input-output)

## `pak-extract extract [INPUT] [OUTPUT]`

```
USAGE
  $ pak-extract extract [INPUT] [OUTPUT]

OPTIONS
  -a, --actionlist             Find all files that match .actionlist
  -d, --db                     Find all files that match .<word>db
  -d, --since=since            Format: YYYY-MM-DD
  -e, --extension=extension    Find files with extension. Use comma separated string for multiple extensions.
  -f, --folders=folders        Folders to extract.
  -h, --help                   show CLI help
  -i, --dds                    Find all dds and dds.# files.
  -l, --localization           localization XML files

  -m, --concurrent=concurrent  [default: 2] Sets the maximum number of archives to extract at a time. Use this option if
                               you suffer from segfaults in multi (default) mode. Defaults to a quarter your core count.

  -r, --regex=regex            Find files that match the regular expression value.

  -t, --text                   Find all xml and json files.

  -x, --exclude=exclude        File extensions to ignore.

  --crc                        Skip files that having matching CRC32 values in the output directory.

  --debug                      Prints debug information.

  --single                     Extracts the archives one at a time. Use this option if you are suffering from segfaults
                               and the max concurrent option doesn't help. SLOW

  --skip                       Skip files that already exist in the output directory

EXAMPLE
  pak-extract extract <path to folder containing .pak> <Path to ouput folder>
```

_See code: [src/commands/extract.ts](https://github.com/NBSL/pak-extract/blob/v0.0.3/src/commands/extract.ts)_
<!-- commandsstop -->
