import { Command, flags } from "@oclif/command";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as cli from "cli-progress";
// import BaseCommand from '../CommandBase'
import * as inquirer from "inquirer";
import { parseDataStrm } from "../extract-data";
import { questions } from "../questions";
import { clearInterval } from "timers";
const multibar = new cli.MultiBar(
  {
    format:
      "Progress: [{bar}] {percentage}% | {value}/{total} | Extracted: {fileCount} | {archiveName} - {filename} ",
    fps: 60,
    clearOnComplete: false,
    stopOnComplete: true,
    hideCursor: true,
  },
  cli.Presets.shades_grey
);

function buildRegex(flags: Record<string, unknown>): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let extensions = flags.extension
      ? (flags.extension as string).split(",")
      : [];
    if (flags.dds) {
      extensions = extensions.concat(["dds.*", "jpg", "jpeg", "png", "tif"]);
    }
    if (flags.text) {
      extensions = extensions.concat(["json", "xml", "txt", "cfg"]);
    }
    if (flags.db) {
      extensions = extensions.concat(["w+db"]);
    }
    if (flags.actionlist) {
      extensions = extensions.concat(["actionlist"]);
    }
    if (flags.localization) {
      extensions = extensions.concat(["localization"]);
    }
    return resolve(extensions);
  });
}

export interface CLIOptions {
  extensions: Array<string>;
  exclude: Array<string>;
  folders?: RegExp;
  regex?: RegExp;

  crc: boolean;
  skip: boolean;
}

export default class Extract extends Command {
  static description =
    "Extracts files from *.pak archives. Currently does not support encrypted archives.";

  static examples = [
    "pak-extract extract <path to folder containing .pak> <Path to ouput folder>",
  ];

  public prompt = inquirer.createPromptModule();

  static flags = {
    help: flags.help({ char: "h" }),
    // flag with a value (-n, --name=VALUE)
    since: flags.string({ char: "d", description: "Format: YYYY-MM-DD" }),
    extension: flags.string({
      char: "e",
      description:
        "Find files with extension. Use comma separated string for multiple extensions.",
    }),
    exclude: flags.string({
      char: "x",
      description: "File extensions to ignore.",
    }),
    regex: flags.string({
      char: "r",
      description: "Find files that match the regular expression value.",
    }),
    folders: flags.string({ char: "f", description: "Folders to extract. " }),
    dds: flags.boolean({
      char: "i",
      description: "Find all dds and dds.# files.",
    }),
    text: flags.boolean({
      char: "t",
      description: "Find all xml and json files.",
    }),
    db: flags.boolean({
      char: "d",
      description: "Find all files that match .<word>db",
    }),
    actionlist: flags.boolean({
      char: "a",
      description: "Find all files that match .actionlist",
    }),
    localization: flags.boolean({
      char: "l",
      description: "localization XML files",
    }),
    concurrent: flags.integer({
      char: "m",
      description:
        "Sets the maximum number of archives to extract at a time. Use this option if you suffer from segfaults in multi (default) mode. Defaults to a quarter your core count.",
      default: os.cpus().length * 0.25,
    }),
    single: flags.boolean({
      description:
        "Extracts the archives one at a time. Use this option if you are suffering from segfaults and the max concurrent option doesn't help. SLOW",
    }),
    skip: flags.boolean({
      description: "Skip files that already exist in the output directory",
    }),
    crc: flags.boolean({
      description:
        "Skip files that having matching CRC32 values in the output directory.",
    }),
    debug: flags.boolean({ description: "Prints debug information." }),
  };

  static args = [{ name: "input" }, { name: "output" }];

  async run() {
    const { args, flags } = this.parse(Extract);
    const answers = await this.prompt<Record<string, string>>(
      questions(args, flags)
    );
    const _input: string = args.input || answers.input;
    const _output: string = args.output || answers.output;
    const _since: string = flags.since || answers.since;
    const _options: CLIOptions = {} as CLIOptions;
    _options.crc = flags.crc;
    _options.skip = flags.skip;
    _options.exclude = flags.exclude
      ? (flags.exclude as string).split(",")
      : [];
    _options.folders = flags.folders
      ? new RegExp(
          `^${flags.folders.replace(/\\/g, "/").split(",").join("|")}.*`,
          "i"
        )
      : undefined;
    let pakFiles: Array<string> = [];
    if (_input.includes(".pak")) {
      pakFiles.push(_input);
    } else {
      const assetDir: Array<string> = fs.readdirSync(path.resolve(_input));
      pakFiles = assetDir.filter((file) => {
        return /.*\.pak/i.test(file);
      });
    }
    _options.extensions = await buildRegex(flags);
    _options.regex = flags.regex ? new RegExp(flags.regex, "i") : undefined;
    if (flags.debug) {
      console.log(_options);
      console.log(flags);
      console.log(pakFiles);
    }
    if (flags.single) {
      for await (const file of pakFiles) {
        const _fp = path.resolve(_input, file);
        try {
          await parseDataStrm(_fp, _since, _output, multibar, _options);
        } catch (error) {
          this.log(error);
        }
      }
    } else {
      let interval: unknown;
      let max = flags.concurrent;
      let current = 1;
      interval = setInterval(async () => {
        if (pakFiles.length === 0) {
          clearInterval(interval as NodeJS.Timeout);
        }
        if (current <= max) {
          current++;
          const file = pakFiles.pop();
          if (file) {
            const _fp = path.resolve(_input, file!);
            await parseDataStrm(_fp, _since, _output, multibar, _options);
            current--;
          } else {
            clearInterval(interval as NodeJS.Timeout);
          }
        }
      }, 1000);
      // pakFiles.forEach(async (file) => {
      //   const _fp = path.resolve(_input, file);
      //   try {
      //     await parseDataStrm(_fp, _since, _output, multibar, _options);
      //   } catch (error) {
      //     this.log(error);
      //   }
      // });
    }
  }
}
