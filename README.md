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
pak-extract/0.0.1 win32-x64 node-v14.15.1
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
  -a, --actionlist           Find all files that match .actionlist
  -d, --since=since          Format: YYYY-MM-DD
  -e, --extension=extension  Find files with extension. Use comma separated string for multiple extensions.
  -h, --help                 show CLI help
  -i, --dds                  Find all dds and dds.# files.
  -t, --text                 Find all xml and json files.
  -x, --db                   Find all files that match .<word>db

EXAMPLE
  pak-extract extract <path to folder containing .pak> <Path to ouput folder>
```

_See code: [src/commands/extract.ts](https://github.com/NBSL/pak-extract/blob/v0.0.1/src/commands/extract.ts)_
<!-- commandsstop -->
