use libloading::{Library, Symbol};
use std::os::raw::{c_int, c_long, c_uint};
use std::path::Path;

type OodleLZDecompressFn = unsafe extern "C" fn(
    src: *const u8,
    src_len: c_int,
    dst: *mut u8,
    dst_len: c_int,
    fuzz_safe: c_int,
    check_crc: c_int,
    verbosity: c_int,
    dec_buf_base: *mut u8,
    dec_buf_size: usize,
    fp_callback: *mut u8,
    callback_user_data: *mut u8,
    decoder_memory: *mut u8,
    decoder_memory_size: usize,
    thread_phase: c_int,
) -> c_int;

pub struct Oodle {
    _lib: Library,
    decompress_fn: OodleLZDecompressFn,
}

// Implement Send and Sync so it can be shared across rayon threads safely.
// The Oodle decompression function is pure and thread-safe.
unsafe impl Send for Oodle {}
unsafe impl Sync for Oodle {}

impl Oodle {
    pub fn new() -> Result<Self, libloading::Error> {
        let dll_path = std::env::var("OODLE_LIBRARY_PATH").unwrap_or_else(|_| ".".to_string());
        let (lib_name, fn_name) = if cfg!(target_os = "windows") {
            (
                Path::new(&dll_path).join("oo2core_8_win64.dll"),
                b"OodleLZ_Decompress\0",
            )
        } else if cfg!(target_os = "linux") {
            (
                Path::new(&dll_path).join("liblinoodle.so"),
                b"OodleLZ_Decompress\0",
            )
        } else {
            println!("Unsupported platform");
            return Err(libloading::Error::DlOpenUnknown);
        };

        unsafe {
            let lib = Library::new(&lib_name)?;
            let decompress_fn: Symbol<OodleLZDecompressFn> = lib.get(fn_name)?;
            let decompress_fn = *decompress_fn;
            Ok(Self {
                _lib: lib,
                decompress_fn,
            })
        }
    }

    pub fn decompress(&self, src: &[u8], expected_size: usize) -> Option<Vec<u8>> {
        let mut dst = vec![0u8; expected_size + 64];
        let res = unsafe {
            (self.decompress_fn)(
                src.as_ptr(),
                src.len() as c_int,
                dst.as_mut_ptr(),
                expected_size as c_int,
                0,
                0,
                0,
                std::ptr::null_mut(),
                0,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                0,
                0,
            )
        };
        if res == expected_size as c_int {
            dst.truncate(expected_size);
            Some(dst)
        } else {
            None
        }
    }
}
