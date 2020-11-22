import * as cli from 'cli-progress'
import * as path from 'path'
import { oodleLibDecompress as decompress } from './Oodle'
import { createWriteStream, ensureDir, WriteStream } from 'fs-extra'
import { Readable, Transform } from 'stream'
import { open, Entry, ZipFile } from 'yauzl'

const unknownOptions = {
  decompress: null,
  decrypt: null,
  start: null,
  end: null,
  decodeFileData: false,
}

function handleDeflate(entry: Entry, zip: ZipFile, writeStream: WriteStream, progress: cli.SingleBar) {
  zip.openReadStream(entry, function (err: Error | undefined, readStream: Readable | undefined) {
    if (err) {
      console.error(err)
      zip.readEntry()
    }
    readStream?.on('end', function () {
      progress.increment()

      zip.readEntry()
    })
    readStream?.pipe(writeStream)
  })
}

function handleUnknown(entry: Entry, zip: ZipFile, writeStream: WriteStream, progress: cli.SingleBar) {
  zip.openReadStream(entry, unknownOptions, function (err: Error | undefined, readStream: Readable | undefined) {
    if (err) {
      console.error(err)
      zip.readEntry()
    }
    const data: Buffer[] = []
    const decompressData = new Transform()
    decompressData._transform = function (chunk, enc, done) {
      const buff = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc)
      data.push(buff)
      done()
    }
    decompressData._flush = function (done) {
      const buff = Buffer.concat(data)
      this.push(decompress(buff as Buffer, entry.uncompressedSize))
      done()
    }
    readStream?.on('end', function () {
      progress.increment()
      zip.readEntry()
    })
    readStream?.pipe(decompressData).pipe(writeStream)
  })
}

export async function parseDataStrm(archivePath: string, since: string | null, output: string | null, cliMB: cli.MultiBar, extension: RegExp | undefined) {
  return new Promise((resolve, reject) => {
    try {
      const _since = since || '2019-11-01'
      const _outputDir = output ? path.resolve(output) : path.resolve(__dirname)
      return open(path.resolve(archivePath), { lazyEntries: true, validateEntrySizes: false }, function (err: Error | undefined, zip: ZipFile | undefined) {
        const progress = cliMB.create(zip?.entryCount || 0, 0, { filename: path.basename(archivePath) })
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
          if (/\/$/.test(entry.fileName)) {
            await ensureDir(entry.fileName)
            progress.increment()
            zip.readEntry()
          } else if (entry.getLastModDate() < new Date(_since)) {
            progress.increment()
            zip.readEntry()
          } else if (extension && !extension.test(path.extname(entry.fileName))) {
            progress.increment()
            zip.readEntry()
          } else {
            const _filePath = path.resolve(_outputDir, entry.fileName)
            const _fileDir = path.dirname(_filePath)
            await ensureDir(_fileDir)
            const ws = createWriteStream(_filePath)
            if (entry.compressionMethod === 0 || entry.compressionMethod === 8) {
              handleDeflate(entry, zip, ws, progress)
            } else if (entry.compressionMethod === 15) {
              handleUnknown(entry, zip, ws, progress)
            } else {
              process.stderr.write(`Unknown compression method ${entry.compressionMethod}`)
            }
          }
        })
      })
    } catch (error) {
      console.error(error)
      reject(error)
    }
  })
}

