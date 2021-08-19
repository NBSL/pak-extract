import * as cli from 'cli-progress'
import * as path from 'path'
import { oodleLibDecompress as decompress } from './Oodle'
import {
  createWriteStream,
  ensureDir,
  existsSync,
  lstatSync,
  readFileSync,
  utimesSync,
  WriteStream
} from 'fs-extra'
import { pipeline, Readable, Transform } from 'stream'
import { open, Entry, ZipFile } from 'yauzl'
import { crc32 } from 'crc'
import { CLIOptions } from './commands/extract'
import { promisify } from 'util'
import { statSync } from 'fs'

const _pipeline = promisify(pipeline)

const unknownOptions = {
  decompress: null,
  decrypt: null,
  start: null,
  end: null,
  decodeFileData: false
}

function handleDeflate (entry: Entry, zip: ZipFile, writeStream: WriteStream) {
  zip.openReadStream(entry, function (
    err: Error | undefined,
    readStream: Readable | undefined
  ) {
    if (err) {
      console.error(err)
      zip.readEntry()
    } else {
      readStream?.on('end', function () {
        // progress.increment()
        // zip.readEntry()
      })
      writeStream.on('finish', () => writeStream.end())
      readStream?.pipe(writeStream)
    }
  })
}

function handleUnknown (entry: Entry, zip: ZipFile, writeStream: WriteStream) {
  zip.openReadStream(entry, unknownOptions, async function (
    err: Error | undefined,
    readStream: Readable | undefined
  ) {
    if (err) {
      console.error(err)
      zip.readEntry()
    } else {
      const data: Buffer[] = []
      const decompressData = new Transform()
      decompressData._transform = function (chunk, enc, done) {
        const buff = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc)
        data.push(buff)
        done()
      }
      decompressData._flush = function (done) {
        const _buf = Buffer.concat(data)
        if (_buf.length === entry.compressedSize) {
          // console.log(
          //   `Decompressing ${entry.fileName} with length ${entry.compressedSize} & ${entry.uncompressedSize}`
          // );
          const uncompressed = decompress(
            _buf as Buffer,
            entry.uncompressedSize
          )
          if (uncompressed) {
            this.push(uncompressed.slice(0, entry.uncompressedSize))
          } else {
            console.error(`Failed to decompress ${entry.fileName}`)
          }
        } else {
          console.error(
            `Size Mismatch! Got ${_buf.length}, expected ${entry.compressedSize}. Skipping ${entry.fileName} in ${zip.name}.`
          )
        }
        done()
      }
      readStream?.on('end', function () {
        // progress.increment()
        // zip.readEntry()
      })
      writeStream.on('finish', () => writeStream.end())
      // writeStream.on("pipe", (src: Buffer) =>
      //   // console.log(src, entry.compressedSize)
      // );
      try {
        if (readStream) {
          await _pipeline(readStream, decompressData, writeStream)
          // readStream?.pipe(decompressData).pipe(writeStream);
        }
      } catch (error) {
        console.error(error)
      }
    }
  })
}

export async function parseDataStrm (
  archivePath: string,
  since: string | null,
  output: string | null,
  cliMB: cli.MultiBar,
  options: CLIOptions
) {
  return new Promise((resolve, reject) => {
    try {
      const _since = since || '2019-11-01'
      const extensions =
        options.extensions.length > 0
          ? new RegExp(
              `\\.${options.extensions.join('|').replace(/\./g, '')}$`,
              'i'
            )
          : undefined
      const excludes =
        options.exclude.length > 0
          ? new RegExp(
              `\\.${options.exclude.join('|').replace(/\./g, '')}$`,
              'i'
            )
          : undefined
      let fileCount = 0
      const _outputDir = output ? path.resolve(output) : path.resolve(__dirname)
      return open(
        path.resolve(archivePath),
        { lazyEntries: true, validateEntrySizes: false },
        function (err: Error | undefined, zip: ZipFile | undefined) {
          if (err) console.error(err)
          const progress = cliMB.create(zip?.entryCount || 0, 0, {
            archiveName: path.basename(archivePath),
            fileCount: fileCount
          })
          function next () {
            progress.increment({ filename: '' })
            zip?.readEntry()
          }
          zip?.once('close', function () {
            // console.log('End called')
            progress.stop()
            return resolve(true)
          })
          zip?.on('error', console.error)
          if (err) {
            console.error(`Error opening ${archivePath}: `, err.message)
            progress.stop()
            return resolve(true)
          }
          zip?.readEntry()
          zip?.on('entry', async (entry: Entry) => {
            // console.log(entry.fileName);
            const _filePath = path.resolve(_outputDir, entry.fileName)
            const _fileDir = path.dirname(_filePath)
            if (/\/$/.test(entry.fileName)) {
              next()
            } else if (entry.getLastModDate() < new Date(_since)) {
              next()
            } else if (excludes && excludes.test(entry.fileName)) {
              next()
            } else if (
              extensions &&
              extensions.test(entry.fileName) === false
            ) {
              next()
            } else if (
              options.folders &&
              options.folders.test(entry.fileName) === false
            ) {
              next()
            } else if (
              options.regex &&
              options.regex.test(entry.fileName) === false
            ) {
              next()
            } else {
              if (
                options.skip &&
                existsSync(_filePath) &&
                statSync(_filePath).size === entry.uncompressedSize
              ) {
                next()
              } else if (
                options.crc &&
                existsSync(_filePath) &&
                entry.crc32 === crc32(readFileSync(_filePath))
              ) {
                next()
              } else {
                await ensureDir(_fileDir)
                fileCount += 1
                progress.increment({
                  filename: entry.fileName,
                  fileCount: fileCount
                })
                await ensureDir(_fileDir)
                const ws = createWriteStream(_filePath)
                ws.on('finish', () => {
                  const stat = lstatSync(_filePath)
                  utimesSync(_filePath, stat.atime, entry.getLastModDate())
                  zip.readEntry()
                })
                if (
                  entry.compressionMethod === 0 ||
                  entry.compressionMethod === 8
                ) {
                  handleDeflate(entry, zip, ws)
                } else if (entry.compressionMethod === 15) {
                  handleUnknown(entry, zip, ws)
                } else {
                  process.stderr.write(
                    `Unknown compression method ${entry.compressionMethod}`
                  )
                }
              }
            }
          })
        }
      )
    } catch (error) {
      console.error(error)
      reject(error)
    }
  })
}
