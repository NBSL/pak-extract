/* eslint-disable no-console */
/* eslint-disable new-cap */
/* eslint-disable unicorn/filename-case */
import { OodleLib } from './wrapper'
import * as ref from 'ref-napi'
export function oodleLibDecompress(src: Buffer, length: number) {
  src.type = ref.types.byte
  const outputBuff = Buffer.alloc(length + 64)
  // outputBuff.type = ref.types.byte
  const decompressedCount = OodleLib().OodleLZ_Decompress(src, src.byteLength, outputBuff, length, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
  if (decompressedCount === length) {
    return outputBuff
  }
  return false

  // return outputBuff
}

// export function oozLibDecompress(src: Buffer, length: number) {
//   src.type = ref.types.uint8
//   const outputBuff = Buffer.alloc(length)
//   // outputBuff.type = ref.types.byte
//   console.log(length, src)
//   const decompressedCount = OozLib.Kraken_Decompress(src, src.byteLength, outputBuff, length)
//   console.log(decompressedCount)
//   if (decompressedCount === length) {
//     return outputBuff
//   }
//   return false

//   // return outputBuff
// }
