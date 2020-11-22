/* eslint-disable new-cap */
import * as ffi from 'ffi-napi'
import * as ref from 'ref-napi'
import { platform, env, cwd } from 'process'
import * as path from 'path'

// https://github.com/chrsm/x/blob/master/destiny/oodle/oodle_win.go For function exports

export function OodleLib() {
  if (platform !== 'win32' && platform !== 'linux') throw new Error(`${platform} is currently unsupported.`)

  const dllPath = env.OODLE_LIBRARY_PATH || cwd()

  const srcPtr = ref.refType(ref.types.void)
  const outPtr = ref.refType(ref.types.void)

  const platformLibrary = {
    win32: path.join(dllPath, './oo2core_8_win64.dll'),
    linux: path.join(dllPath, './liblinoodle.so'),
  }
  return ffi.Library(platformLibrary[platform], {
    OodleLZ_Decompress: ['int', [srcPtr, 'int', outPtr, 'int', 'uint', 'uint', 'long', 'uint', 'uint', 'uint', 'uint', 'uint', 'uint', 'uint']],
    // 'OodleLZ_Compress': ['char', ['byte', 'int', 'byte', 'int', 'uint', 'uint', 'uint']],
    // 'Oodle_GetConfigValues': [_void, [_void]],
    // 'Oodle_SetConfigValues': [_void, [_void]],
    // 'OodleLZ_Compressor_GetName': ['int', ['int']],
    // 'OodleNetwork1_Shared_SetWindow': [_void, [_void, int, _void, int]],
    // 'OodleNetwork1_Shared_Size': [int, [int]],
    // 'OodleNetwork1TCP_Decode': [int, [_void, _void, _void, int, _void, int]],
    // 'OodleNetwork1TCP_Encode': [int, [_void, _void, _void, int, _void]],
    // 'OodleNetwork1TCP_State_Size': [int, []],
    // 'OodleNetwork1UDP_State_Uncompact': [_void, [_void, _void]],
  })
}

// export const OozLib = ffi.Library(path.join(dllPath, 'libooz'), {
//   Kraken_Decompress: ['int', [srcPtr, 'int', outPtr, 'int']],
// })

// OOZ_EXPORT int Kraken_DecodeBytes(uint8_t** output, const uint8_t* src, const uint8_t* src_end, int* decoded_size, size_t output_size,
// bool force_memmove, uint8_t * scratch, uint8_t * scratch_end);
// OOZ_EXPORT int Kraken_Decompress(const uint8_t* src, size_t src_len, uint8_t * dst, size_t dst_len);
// OOZ_EXPORT int Kraken_GetBlockSize(const uint8_t* src, const uint8_t* src_end, int * dest_size, int dest_capacity);
// OOZ_EXPORT int Huff_ConvertToRanges(HuffRange * range, int num_symbols, int P, const uint8_t* symlen, BitReader * bits);
