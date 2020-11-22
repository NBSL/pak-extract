/* eslint-disable unicorn/no-process-exit */
/* eslint-disable no-process-exit */
/* eslint-disable no-useless-escape */
/* eslint-disable unicorn/escape-case */
import { Command, flags } from '@oclif/command'
import * as path from 'path'
import * as fs from 'fs'
import * as cli from 'cli-progress'
// import BaseCommand from '../CommandBase'
import * as inquirer from 'inquirer'
import { parseDataStrm } from '../extract-data'
import { questions } from '../questions'
const multibar = new cli.MultiBar({
  format: 'progress [{bar}] {percentage}% | {value}/{total} | {filename}',
  fps: 60,
  clearOnComplete: false,
  stopOnComplete: true,
  hideCursor: true,
}, cli.Presets.shades_grey)

export default class Extract extends Command {
  static description = 'Extracts files from *.pak archives. Currently does not support encrypted archives.'

  static examples = [
    'pak-extract extract <path to folder containing .pak> <Path to ouput folder>',
  ]

  public prompt = inquirer.createPromptModule()

  static flags = {
    help: flags.help({ char: 'h' }),
    // flag with a value (-n, --name=VALUE)
    since: flags.string({ char: 'd', description: 'Format: YYYY-MM-DD' }),
    extension: flags.string({ char: 'e', description: 'Find files with extension. Use comma separated string for multiple extensions.' }),
    dds: flags.boolean({ char: 'i', description: 'Find all dds and dds.# files.' }),
    text: flags.boolean({ char: 't', description: 'Find all xml and json files.' }),
    db: flags.boolean({ char: 'x', description: 'Find all files that match .<word>db' }),
    actionlist: flags.boolean({ char: 'a', description: 'Find all files that match .actionlist' }),
    // flag with no value (-f, --force)
    // force: flags.boolean({char: 'f'}),
  }

  static args = [{ name: 'input' }, { name: 'output' }]

  async run() {
    const { args, flags } = this.parse(Extract)
    const answers = await this.prompt<Record<string, string>>(questions(args, flags))
    const _input: string = args.input || answers.input
    const _output: string = args.output || answers.output
    const _since: string = flags.since || answers.since
    const assetDir: Array<string> = fs.readdirSync(path.resolve(_input))
    let extensions: Array<string> = flags.extension ? flags.extension.replace(/\./g, '').split(',') : []
    if (flags.dds) {
      extensions = extensions.concat([
        'dds',
        'dds.\d{1}',
      ])
    }
    if (flags.text) {
      extensions = extensions.concat([
        'json',
        'xml',
      ])
    }
    if (flags.db) {
      extensions = extensions.concat([
        '\w+db',
      ])
    }
    if (flags.actionlist) {
      extensions = extensions.concat([
        'actionlist',
      ])
    }
    const extRegExp = extensions.length > 0 ? new RegExp(extensions.join('|'), 'ig') : undefined
    const pakFiles: Array<string> = assetDir.filter((file => {
      return file.match(/.*\.pak/ig)
    }))
    pakFiles.forEach(async file => {
      const _fp = path.resolve(_input, file)
      // console.log('Parsing', _fp)
      try {
        await parseDataStrm(_fp, _since, _output, multibar, extRegExp)
      } catch (error) {
        this.log(error)
      }
    })
  }
}
