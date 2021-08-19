/* eslint-disable indent */
/* eslint-disable new-cap */
import * as ffi from "ffi-napi";
import * as ref from "ref-napi";
import { platform, env, cwd } from "process";
import * as path from "path";

// https://github.com/chrsm/x/blob/master/destiny/oodle/oodle_win.go For function exports

export function OodleLib() {
  if (platform !== "win32" && platform !== "linux")
    throw new Error(`${platform} is currently unsupported.`);

  const dllPath = env.OODLE_LIBRARY_PATH || cwd();

  const srcPtr = ref.refType(ref.types.void);
  const outPtr = ref.refType(ref.types.void);

  // const platformLibrary = {
  //   win32: path.join(dllPath, './oo2core_8_win64.dll'),
  //   linux: path.join(dllPath, './liblinoodle.so'),
  // }

  switch (platform) {
    case "linux":
      // return ffi.Library(path.join(dllPath, './liboodle.so'), {
      //   _Z17Kraken_DecompressPKhmPhm: ['int', [srcPtr, 'int', outPtr, 'int']],
      // })
      return ffi.Library(path.join(dllPath, "./liblinoodle.so"), {
        OodleLZ_Decompress: [
          "int",
          [
            srcPtr,
            "int",
            outPtr,
            "int",
            "uint",
            "uint",
            "long",
            "uint",
            "uint",
            "uint",
            "uint",
            "uint",
            "uint",
            "uint",
          ],
        ],
      });
    case "win32":
    default:
      return ffi.Library(path.join(dllPath, "./oo2core_8_win64.dll"), {
        OodleLZ_Decompress: [
          "int",
          [
            srcPtr,
            "int",
            outPtr,
            "int",
            "uint",
            "uint",
            "long",
            "uint",
            "uint",
            "uint",
            "uint",
            "uint",
            "uint",
            "uint",
          ],
        ],
        OodleLZ_Compress: [
          "char",
          ["byte", "int", "byte", "int", "uint", "uint", "uint"],
        ],
      });
  }
}

// export const OozLib = ffi.Library(path.join(dllPath, 'libooz'), {
//   Kraken_Decompress: ['int', [srcPtr, 'int', outPtr, 'int']],
// })

// OOZ_EXPORT int Kraken_DecodeBytes(uint8_t** output, const uint8_t* src, const uint8_t* src_end, int* decoded_size, size_t output_size,
// bool force_memmove, uint8_t * scratch, uint8_t * scratch_end);
// OOZ_EXPORT int Kraken_Decompress(const uint8_t* src, size_t src_len, uint8_t * dst, size_t dst_len);
// OOZ_EXPORT int Kraken_GetBlockSize(const uint8_t* src, const uint8_t* src_end, int * dest_size, int dest_capacity);
// OOZ_EXPORT int Huff_ConvertToRanges(HuffRange * range, int num_symbols, int P, const uint8_t* symlen, BitReader * bits);
