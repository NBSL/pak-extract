import { cwd } from 'process'
export function questions(args: Record<string, unknown>, flags: Record<string, unknown>) {
  const _questions = []
  if (!args.input) {
    _questions.push({
      type: 'input',
      name: 'input',
      message: 'Path to the New World Assets folder',
      default: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\New World Public Test\\assets',
    })
  }
  if (!args.output) {
    _questions.push({
      type: 'input',
      name: 'output',
      default: cwd(),
      message: 'Path to the output folder',
    })
  }
  if (!flags.since) {
    _questions.push({
      type: 'input',
      name: 'since',
      default: '2019-11-01',
      message: 'Find files modified since date. Format YYYY-MM-DD',
    })
  }
  return _questions
}
