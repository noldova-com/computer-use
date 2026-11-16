/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

#define WIN32_LEAN_AND_MEAN
#define COBJMACROS
#define UNICODE
#define _UNICODE
#undef WINVER
#define WINVER 0x0A00
#undef _WIN32_WINNT
#define _WIN32_WINNT 0x0A00

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <windows.h>
#include <ole2.h>
#include <UIAutomation.h>
#include <dwmapi.h>
#include <shellscalingapi.h>
#include <wincrypt.h>
#include <softpub.h>
#include <wintrust.h>
#include <shellapi.h>
#include <shlobj.h>

#include <node_api.h>

#ifndef PW_RENDERFULLCONTENT
#define PW_RENDERFULLCONTENT 0x00000002
#endif

#ifndef CREATE_WAITABLE_TIMER_HIGH_RESOLUTION
#define CREATE_WAITABLE_TIMER_HIGH_RESOLUTION 0x00000002
#endif

#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "advapi32.lib")
#pragma comment(lib, "kernel32.lib")
#pragma comment(lib, "shcore.lib")
#pragma comment(lib, "dwmapi.lib")
#pragma comment(lib, "crypt32.lib")
#pragma comment(lib, "version.lib")
#pragma comment(lib, "wintrust.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "oleaut32.lib")
#pragma comment(lib, "shell32.lib")

#define ERROR_CODE "ERR_WINDOWS_DESKTOP"
#define MAX_IMAGE_PATH 1024
#define MAX_WINDOW_ID 32
#define MAX_CAPTURE_SIDE 32768
#define MAX_CAPTURE_TIMEOUT_MS 60000
#define DRAWING_SLOTS 64
#define MAX_TEXT_UNITS 256
#define MAX_ARGUMENTS 9
#define MAX_GLIDE_STEPS 64
#define MAX_GLIDE_MS 1000
#define MAX_INPUT_POINTS 2
#define MAX_SCROLL_NOTCHES 50
#define MAX_ERROR_TEXT 128
#define MONITOR_START_TIMEOUT_MS 5000
#define MONITOR_STOP_TIMEOUT_MS 5000
#define NORMALIZED_SPAN 65536.0
#define CLASS_NAME_LENGTH 16
#define MAX_CLASS_NAME 256
#define MAX_LISTED_WINDOWS 65536
#define MAX_APP_PATHS 1024
#define MAX_KEY_NAME 256
#define MAX_PROGRAM_TEXT 256
#define MAX_ICON_SIDE 1024
#define VERSION_QUERY_LENGTH 64
#define APP_PATHS_KEY L"Software\\Microsoft\\Windows\\CurrentVersion\\App Paths"
#define FILE_EXPLORER L"explorer.exe"
#define FOLDER_WINDOW_CLASS L"CabinetWClass"
#define FRAME_HOST L"ApplicationFrameHost.exe"
#define CORE_WINDOW_CLASS L"Windows.UI.Core.CoreWindow"

#define MAX_NAME 16
#define MAX_MODIFIERS 4

#define PHYSICAL_POINTER 0
#define PHYSICAL_KEYBOARD 1
#define KEY_PROCESS_NONE (-1)
#define KEY_PROCESS_UNKNOWN 0

#define MAX_CONTROL_TEXT 402
#define MAX_CONTROL_HANDLE 32
#define MAX_CONTROL_CHILDREN 200
#define MAX_CONTROL_DEPTH 50
#define MAX_READ_CONTROLS 2000
#define MAX_CONTROL_ROOTS 16
#define MAX_CONTROL_IMAGES 32
#define MAX_HIT_LEVELS 64
#define MAX_CONTROL_TIMEOUT_MS 60000
#define UIA_TIMEOUT_MS 1000
#define CONTROL_GRACE_MS 50
#define MAX_BORDER_FRAMES 16
#define BORDER_SIDES 4
#define BORDER_TIMEOUT_MS 5000
#define BORDER_CLASS L"NoldovaComputerUseBorder"
#define WM_BORDER_SHOW (WM_APP + 1)
#define WM_BORDER_HIDE (WM_APP + 2)

#define PROPERTY_BOUNDS 30001
#define PROPERTY_PROCESS_ID 30002
#define PROPERTY_CONTROL_TYPE 30003
#define PROPERTY_NAME 30005
#define PROPERTY_HAS_FOCUS 30008
#define PROPERTY_IS_ENABLED 30010
#define PROPERTY_IS_PASSWORD 30019
#define PROPERTY_IS_OFFSCREEN 30022
#define PROPERTY_HAS_TEXT_PATTERN 30040
#define PROPERTY_HAS_VALUE_PATTERN 30043
#define PROPERTY_VALUE 30045
#define PROPERTY_IS_READ_ONLY 30046
#define PROPERTY_EXPAND_STATE 30070
#define PROPERTY_IS_SELECTED 30079
#define PROPERTY_TOGGLE_STATE 30086
#define PATTERN_TEXT 10014

#define REASON_NOT_FOREGROUND "NotForeground"
#define REASON_OTHER_WINDOW "OtherWindowAtPoint"
#define REASON_ELEVATED "ElevatedTarget"
#define REASON_RIGHTS_UNKNOWN "TargetRightsUnknown"
#define REASON_FOREGROUND_CHANGED "ForegroundChanged"
#define REASON_PASSWORD_FIELD "PasswordField"
#define REASON_PHYSICAL_INPUT "PhysicalInput"
#define REASON_FOCUS_OUTSIDE "FocusOutsideTarget"
#define REASON_FOCUS_UNKNOWN "FocusUnknown"

#define CHECK(env, call)                \
  do {                                  \
    if ((call) != napi_ok) {            \
      throw_pending((env));             \
      return NULL;                      \
    }                                   \
  } while (0)

typedef struct {
  HWND window;
  DWORD process_id;
  WCHAR image[MAX_IMAGE_PATH];
} target_window;

typedef enum {
  RIGHTS_NOT_ABOVE,
  RIGHTS_ABOVE,
  RIGHTS_UNKNOWN
} target_rights;

typedef struct {
  HWND window;
  DWORD process_id;
  WCHAR image[MAX_IMAGE_PATH];
  DWORD image_length;
  RECT frame;
  target_rights rights;
} window_facts;

typedef struct {
  INPUT *items;
  UINT count;
  UINT capacity;
  BOOL overflowed;
  LONG origin_x;
  LONG origin_y;
  LONG width;
  LONG height;
} input_batch;

typedef struct {
  napi_env env;
  napi_value array;
  uint32_t count;
  napi_status status;
} display_list;

typedef struct {
  napi_env env;
  napi_value array;
  uint32_t count;
  BOOL is_full;
  napi_status status;
} path_list;

typedef struct {
  napi_env env;
  napi_value array;
  uint32_t count;
  BOOL is_complete;
  napi_status status;
} window_list;

typedef struct {
  WORD language;
  WORD code_page;
} version_translation;

typedef struct {
  volatile LONG references;
  HWND window;
  RECT frame;
  RECT outer;
  uint8_t *pixels;
} window_drawing;

typedef struct {
  napi_async_work work;
  napi_deferred deferred;
  window_drawing *drawing;
  DWORD timeout_ms;
  int32_t width;
  int32_t height;
  uint8_t *pixels;
} window_capture;

static volatile LONG physical_count = 0;
static volatile LONG is_person_input_before_next_send = 0;
static volatile LONG physical_pending[2] = { 0, 0 };
static volatile LONG key_process = KEY_PROCESS_NONE;
static volatile LONG heartbeat_pending = 0;
static LONG heartbeat_sequence = 0;
static UINT heartbeat_interval = 0;
static BOOL monitor_hooked = FALSE;
static HANDLE monitor_thread = NULL;
static DWORD monitor_thread_id = 0;

typedef struct {
  LONG x;
  LONG y;
  LONG width;
  LONG height;
  LONG thickness;
} border_frame;

typedef struct {
  border_frame frames[MAX_BORDER_FRAMES];
  size_t count;
  COLORREF color;
  HANDLE done;
  BOOL is_shown;
  volatile LONG references;
} border_request;

static HANDLE border_thread = NULL;
static DWORD border_thread_id = 0;
static HANDLE border_late_start = NULL;
static DWORD border_start_error = ERROR_SUCCESS;
static HWND border_windows[MAX_BORDER_FRAMES * BORDER_SIDES];
static size_t border_window_count = 0;
static HBRUSH border_brush = NULL;
static border_request shown_border;
static napi_threadsafe_function physical_callback = NULL;
static napi_threadsafe_function heartbeat_callback = NULL;
static SRWLOCK callback_lock = SRWLOCK_INIT;
static HWND drawing_windows[DRAWING_SLOTS];
static SRWLOCK drawing_lock = SRWLOCK_INIT;

static void throw_pending(napi_env env) {
  bool pending = false;
  const napi_extended_error_info *info = NULL;
  napi_is_exception_pending(env, &pending);
  if (pending)
    return;
  napi_get_last_error_info(env, &info);
  napi_throw_error(env, ERROR_CODE, info != NULL && info->error_message != NULL ? info->error_message : "A Node-API call failed.");
}

static napi_value throw_windows_error(napi_env env, const char *message, DWORD error) {
  char text[256];
  _snprintf_s(text, sizeof text, _TRUNCATE, "%s (Windows error %lu)", message, error);
  napi_throw_error(env, ERROR_CODE, text);
  return NULL;
}

static napi_value throw_windows(napi_env env, const char *message) {
  return throw_windows_error(env, message, GetLastError());
}

static napi_status set_number(napi_env env, napi_value object, const char *name, double value) {
  napi_value item;
  napi_status status = napi_create_double(env, value, &item);
  return status != napi_ok ? status : napi_set_named_property(env, object, name, item);
}

static napi_status set_boolean(napi_env env, napi_value object, const char *name, BOOL value) {
  napi_value item;
  napi_status status = napi_get_boolean(env, value != FALSE, &item);
  return status != napi_ok ? status : napi_set_named_property(env, object, name, item);
}

static napi_status set_text(napi_env env, napi_value object, const char *name, const WCHAR *value, size_t length) {
  napi_value item;
  napi_status status = napi_create_string_utf16(env, (const char16_t *)value, length, &item);
  return status != napi_ok ? status : napi_set_named_property(env, object, name, item);
}

static napi_status set_ascii(napi_env env, napi_value object, const char *name, const char *value) {
  napi_value item;
  napi_status status = napi_create_string_utf8(env, value, NAPI_AUTO_LENGTH, &item);
  return status != napi_ok ? status : napi_set_named_property(env, object, name, item);
}

static DPI_AWARENESS_CONTEXT enter_physical_pixels(void) {
  return SetThreadDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
}

static BOOL read_integrity(HANDLE process, DWORD *level) {
  HANDLE token = NULL;
  DWORD size = 0;
  TOKEN_MANDATORY_LABEL *label = NULL;
  BOOL read = FALSE;
  if (!OpenProcessToken(process, TOKEN_QUERY, &token))
    return FALSE;
  GetTokenInformation(token, TokenIntegrityLevel, NULL, 0, &size);
  label = size > 0 ? (TOKEN_MANDATORY_LABEL *)malloc(size) : NULL;
  if (label != NULL && GetTokenInformation(token, TokenIntegrityLevel, label, size, &size)) {
    *level = *GetSidSubAuthority(label->Label.Sid, *GetSidSubAuthorityCount(label->Label.Sid) - 1);
    read = TRUE;
  }
  free(label);
  CloseHandle(token);
  return read;
}

static target_rights compare_integrity(HANDLE process) {
  DWORD own = 0;
  DWORD other = 0;
  if (!read_integrity(GetCurrentProcess(), &own) || !read_integrity(process, &other))
    return RIGHTS_UNKNOWN;
  return other > own ? RIGHTS_ABOVE : RIGHTS_NOT_ABOVE;
}

static const char *refusal_of_rights(target_rights rights) {
  if (rights == RIGHTS_ABOVE)
    return REASON_ELEVATED;
  if (rights == RIGHTS_UNKNOWN)
    return REASON_RIGHTS_UNKNOWN;
  return NULL;
}

static BOOL read_window(HWND window, window_facts *facts) {
  HANDLE process = NULL;
  BOOL read = FALSE;
  facts->window = window;
  facts->process_id = 0;
  facts->image_length = MAX_IMAGE_PATH;
  if (GetWindowThreadProcessId(window, &facts->process_id) == 0)
    return FALSE;
  if (FAILED(DwmGetWindowAttribute(window, DWMWA_EXTENDED_FRAME_BOUNDS, &facts->frame, sizeof facts->frame)) && !GetWindowRect(window, &facts->frame))
    return FALSE;
  process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, facts->process_id);
  if (process == NULL)
    return FALSE;
  if (QueryFullProcessImageNameW(process, 0, facts->image, &facts->image_length)) {
    facts->rights = compare_integrity(process);
    read = TRUE;
  }
  CloseHandle(process);
  return read;
}

static LONG read_physical_count(void) {
  return InterlockedCompareExchange(&physical_count, 0, 0);
}

static const char *check_focus(const target_window *target, DWORD focus_ms);

static BOOL is_password_field(HWND window) {
  GUITHREADINFO gui;
  WCHAR class_name[CLASS_NAME_LENGTH];
  DWORD thread = GetWindowThreadProcessId(window, NULL);
  gui.cbSize = sizeof gui;
  if (!GetGUIThreadInfo(thread, &gui) || gui.hwndFocus == NULL)
    return FALSE;
  if (GetClassNameW(gui.hwndFocus, class_name, CLASS_NAME_LENGTH) == 0)
    return FALSE;
  return CompareStringOrdinal(class_name, -1, L"Edit", -1, TRUE) == CSTR_EQUAL && (GetWindowLongPtrW(gui.hwndFocus, GWL_STYLE) & ES_PASSWORD) != 0;
}

static BOOL is_shell_window(HWND window, const WCHAR *image) {
  const WCHAR *name = wcsrchr(image, L'\\');
  WCHAR class_name[MAX_CLASS_NAME];
  if (CompareStringOrdinal(name != NULL ? name + 1 : image, -1, FILE_EXPLORER, -1, TRUE) != CSTR_EQUAL)
    return FALSE;
  return GetClassNameW(window, class_name, MAX_CLASS_NAME) == 0 || CompareStringOrdinal(class_name, -1, FOLDER_WINDOW_CLASS, -1, FALSE) != CSTR_EQUAL;
}

static BOOL is_target_in_front(const target_window *target) {
  HWND front = GetForegroundWindow();
  window_facts facts;
  if (front == NULL || GetAncestor(front, GA_ROOT) != target->window)
    return FALSE;
  if (!read_window(target->window, &facts) || facts.process_id != target->process_id)
    return FALSE;
  return CompareStringOrdinal(facts.image, -1, target->image, -1, TRUE) == CSTR_EQUAL;
}

static const char *check_target(const target_window *target, const POINT *points, size_t point_count, DWORD focus_ms) {
  window_facts facts;
  size_t index;
  const char *reason;
  reason = focus_ms != 0 && read_window(target->window, &facts) ? refusal_of_rights(facts.rights) : NULL;
  if (reason != NULL)
    return reason;
  reason = focus_ms != 0 ? check_focus(target, focus_ms) : NULL;
  if (reason != NULL)
    return reason;
  if (!is_target_in_front(target) || !read_window(target->window, &facts) || is_shell_window(target->window, facts.image))
    return REASON_NOT_FOREGROUND;
  reason = refusal_of_rights(facts.rights);
  if (reason != NULL)
    return reason;
  for (index = 0; index < point_count; index++) {
    HWND at = WindowFromPoint(points[index]);
    DWORD owner = 0;
    if (at == NULL)
      return REASON_OTHER_WINDOW;
    at = GetAncestor(at, GA_ROOT);
    GetWindowThreadProcessId(at, &owner);
    if (at != target->window && (owner != target->process_id || is_shell_window(at, facts.image)))
      return REASON_OTHER_WINDOW;
  }
  return NULL;
}

static napi_value read_target(napi_env env, napi_value value, target_window *target) {
  napi_value item;
  char window_id[MAX_WINDOW_ID];
  size_t length = 0;
  uint32_t process_id = 0;
  char *end = NULL;
  unsigned long long handle;
  CHECK(env, napi_get_named_property(env, value, "windowId", &item));
  CHECK(env, napi_get_value_string_utf8(env, item, window_id, sizeof window_id, &length));
  handle = _strtoui64(window_id, &end, 10);
  if (length == 0 || *end != '\0') {
    napi_throw_type_error(env, ERROR_CODE, "The target's windowId isn't a decimal window handle.");
    return NULL;
  }
  CHECK(env, napi_get_named_property(env, value, "processId", &item));
  CHECK(env, napi_get_value_uint32(env, item, &process_id));
  CHECK(env, napi_get_named_property(env, value, "imagePath", &item));
  CHECK(env, napi_get_value_string_utf16(env, item, (char16_t *)target->image, MAX_IMAGE_PATH, &length));
  target->window = (HWND)(uintptr_t)handle;
  target->process_id = process_id;
  return value;
}

static napi_value make_outcome(napi_env env, const char *reason, BOOL input_sent) {
  napi_value outcome;
  CHECK(env, napi_create_object(env, &outcome));
  CHECK(env, set_ascii(env, outcome, "status", reason == NULL ? "done" : "refused"));
  if (reason != NULL) {
    CHECK(env, set_ascii(env, outcome, "reason", reason));
    CHECK(env, set_boolean(env, outcome, "inputSent", input_sent));
  }
  return outcome;
}

static napi_value make_stopped_outcome(napi_env env, BOOL input_sent) {
  napi_value outcome;
  CHECK(env, napi_create_object(env, &outcome));
  CHECK(env, set_ascii(env, outcome, "status", "stopped"));
  CHECK(env, set_boolean(env, outcome, "inputSent", input_sent));
  return outcome;
}

static BOOL open_batch(input_batch *batch, UINT capacity) {
  batch->items = (INPUT *)calloc(capacity, sizeof(INPUT));
  batch->count = 0;
  batch->capacity = capacity;
  batch->overflowed = FALSE;
  batch->origin_x = GetSystemMetrics(SM_XVIRTUALSCREEN);
  batch->origin_y = GetSystemMetrics(SM_YVIRTUALSCREEN);
  batch->width = GetSystemMetrics(SM_CXVIRTUALSCREEN);
  batch->height = GetSystemMetrics(SM_CYVIRTUALSCREEN);
  if (batch->items != NULL && batch->width > 0 && batch->height > 0)
    return TRUE;
  free(batch->items);
  batch->items = NULL;
  return FALSE;
}

static void close_batch(input_batch *batch) {
  free(batch->items);
  batch->items = NULL;
}

static INPUT *next_input(input_batch *batch, DWORD type) {
  INPUT *item;
  if (batch->count >= batch->capacity) {
    batch->overflowed = TRUE;
    return NULL;
  }
  item = &batch->items[batch->count++];
  ZeroMemory(item, sizeof *item);
  item->type = type;
  return item;
}

static void add_mouse(input_batch *batch, POINT at, DWORD flags, DWORD data) {
  INPUT *item = next_input(batch, INPUT_MOUSE);
  if (item == NULL)
    return;
  item->mi.dx = (LONG)(((double)(at.x - batch->origin_x) + 0.5) * NORMALIZED_SPAN / batch->width);
  item->mi.dy = (LONG)(((double)(at.y - batch->origin_y) + 0.5) * NORMALIZED_SPAN / batch->height);
  item->mi.mouseData = data;
  item->mi.dwFlags = flags | MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK;
}

static BOOL is_extended_key(WORD key) {
  switch (key) {
    case VK_LEFT: case VK_RIGHT: case VK_UP: case VK_DOWN:
    case VK_HOME: case VK_END: case VK_PRIOR: case VK_NEXT:
    case VK_INSERT: case VK_DELETE: case VK_LWIN: case VK_RWIN:
      return TRUE;
    default:
      return FALSE;
  }
}

static void add_key(input_batch *batch, WORD key, BOOL is_release) {
  INPUT *item = next_input(batch, INPUT_KEYBOARD);
  if (item == NULL)
    return;
  item->ki.wVk = key;
  item->ki.wScan = (WORD)MapVirtualKeyW(key, MAPVK_VK_TO_VSC);
  item->ki.dwFlags = (is_release ? KEYEVENTF_KEYUP : 0) | (is_extended_key(key) ? KEYEVENTF_EXTENDEDKEY : 0);
}

static void add_unit(input_batch *batch, WCHAR unit, BOOL is_release) {
  INPUT *item = next_input(batch, INPUT_KEYBOARD);
  if (item == NULL)
    return;
  item->ki.wScan = unit;
  item->ki.dwFlags = KEYEVENTF_UNICODE | (is_release ? KEYEVENTF_KEYUP : 0);
}

typedef struct {
  WORD keys[MAX_MODIFIERS];
  uint32_t count;
} modifier_list;

typedef struct {
  const char *name;
  WORD key;
} named_key;

static const modifier_list NO_MODIFIERS = { { 0 }, 0 };

typedef struct {
  POINT point;
  uint32_t at_ms;
} glide_step;

typedef struct {
  napi_async_work work;
  napi_deferred deferred;
  target_window target;
  POINT points[MAX_INPUT_POINTS];
  size_t point_count;
  glide_step *steps;
  uint32_t step_count;
  BOOL is_drag;
  volatile LONG *stop;
  napi_ref stop_ref;
  BOOL is_stopped;
  DWORD down;
  DWORD up;
  modifier_list modifiers;
  LONG physical_before;
  const char *reason;
  BOOL input_sent;
  char error[MAX_ERROR_TEXT];
} pointer_job;

static const named_key MODIFIER_NAMES[] = {
  { "Shift", VK_SHIFT }, { "Control", VK_CONTROL }, { "Alt", VK_MENU }, { "Meta", VK_LWIN }
};

static const named_key KEY_NAMES[] = {
  { "Enter", VK_RETURN }, { "Tab", VK_TAB }, { "Escape", VK_ESCAPE }, { "Backspace", VK_BACK },
  { "Delete", VK_DELETE }, { "Space", VK_SPACE }, { "Up", VK_UP }, { "Down", VK_DOWN },
  { "Left", VK_LEFT }, { "Right", VK_RIGHT }, { "Home", VK_HOME }, { "End", VK_END },
  { "PageUp", VK_PRIOR }, { "PageDown", VK_NEXT }
};

static BOOL find_named_key(const named_key *table, size_t count, const char *name, WORD *key) {
  size_t index;
  for (index = 0; index < count; index++)
    if (strcmp(table[index].name, name) == 0) {
      *key = table[index].key;
      return TRUE;
    }
  return FALSE;
}

static void add_modifiers(input_batch *batch, const modifier_list *modifiers, BOOL is_release) {
  uint32_t index;
  for (index = 0; index < modifiers->count; index++)
    add_key(batch, modifiers->keys[is_release ? modifiers->count - 1 - index : index], is_release);
}

static void add_releases(input_batch *batch, const modifier_list *modifiers, DWORD button_up, WORD key, POINT at) {
  if (button_up != 0)
    add_mouse(batch, at, button_up, 0);
  if (key != 0)
    add_key(batch, key, TRUE);
  add_modifiers(batch, modifiers, TRUE);
}

static BOOL insert_batch(input_batch *batch, const modifier_list *modifiers, DWORD button_up, WORD key, POINT at, char *error) {
  UINT sent;
  error[0] = '\0';
  if (batch->overflowed) {
    strcpy_s(error, MAX_ERROR_TEXT, "The input events outgrew their batch, so none were sent.");
    return FALSE;
  }
  sent = SendInput(batch->count, batch->items, sizeof(INPUT));
  if (sent != batch->count) {
    UINT expected = batch->count;
    batch->count = 0;
    add_releases(batch, modifiers, button_up, key, at);
    if (batch->count > 0)
      SendInput(batch->count, batch->items, sizeof(INPUT));
    _snprintf_s(error, MAX_ERROR_TEXT, _TRUNCATE, "Windows inserted %u of %u input events; another thread blocks input.", sent, expected);
    return FALSE;
  }
  return TRUE;
}

static const char *check_after_send(const target_window *target, LONG physical_before) {
  if (!is_target_in_front(target))
    return REASON_FOREGROUND_CHANGED;
  if (read_physical_count() != physical_before)
    return REASON_PHYSICAL_INPUT;
  return NULL;
}

static LONG read_physical_count_at_call(void) {
  return read_physical_count() - InterlockedExchange(&is_person_input_before_next_send, 0);
}

static napi_value person_input_before_next_send(napi_env env, napi_callback_info info) {
  (void)env;
  (void)info;
  InterlockedExchange(&is_person_input_before_next_send, 1);
  return NULL;
}

static const char *send_batch(const target_window *target, input_batch *batch, LONG physical_before, const modifier_list *modifiers, DWORD button_up, WORD key, POINT at, char *error, BOOL *is_sent) {
  *is_sent = FALSE;
  error[0] = '\0';
  if (!batch->overflowed && read_physical_count() != physical_before)
    return REASON_PHYSICAL_INPUT;
  if (!insert_batch(batch, modifiers, button_up, key, at, error))
    return NULL;
  *is_sent = TRUE;
  return check_after_send(target, physical_before);
}

static napi_value finish_send(napi_env env, const target_window *target, input_batch *batch, LONG physical_before, const modifier_list *modifiers, DWORD button_up, WORD key, POINT at) {
  char error[MAX_ERROR_TEXT];
  BOOL is_sent;
  const char *reason = send_batch(target, batch, physical_before, modifiers, button_up, key, at, error, &is_sent);
  if (error[0] != '\0') {
    napi_throw_error(env, ERROR_CODE, error);
    return NULL;
  }
  return make_outcome(env, reason, is_sent);
}

static napi_value read_arguments(napi_env env, napi_callback_info info, size_t expected, napi_value *values) {
  size_t count = MAX_ARGUMENTS;
  napi_value all[MAX_ARGUMENTS];
  CHECK(env, napi_get_cb_info(env, info, &count, all, NULL, NULL));
  if (count != expected) {
    napi_throw_type_error(env, ERROR_CODE, "The call has the wrong number of arguments.");
    return NULL;
  }
  memcpy(values, all, expected * sizeof(napi_value));
  return values[0];
}

static napi_value read_point(napi_env env, napi_value x, napi_value y, POINT *point) {
  int32_t left = 0;
  int32_t top = 0;
  CHECK(env, napi_get_value_int32(env, x, &left));
  CHECK(env, napi_get_value_int32(env, y, &top));
  point->x = left;
  point->y = top;
  return x;
}

static napi_value read_name(napi_env env, napi_value value, char *name) {
  size_t length = 0;
  CHECK(env, napi_get_value_string_utf8(env, value, name, MAX_NAME, &length));
  return value;
}

static napi_value read_button(napi_env env, napi_value value, DWORD *down, DWORD *up) {
  char name[MAX_NAME];
  if (read_name(env, value, name) == NULL)
    return NULL;
  if (strcmp(name, "Left") == 0) {
    *down = MOUSEEVENTF_LEFTDOWN;
    *up = MOUSEEVENTF_LEFTUP;
  } else if (strcmp(name, "Right") == 0) {
    *down = MOUSEEVENTF_RIGHTDOWN;
    *up = MOUSEEVENTF_RIGHTUP;
  } else if (strcmp(name, "Middle") == 0) {
    *down = MOUSEEVENTF_MIDDLEDOWN;
    *up = MOUSEEVENTF_MIDDLEUP;
  } else {
    napi_throw_range_error(env, ERROR_CODE, "The button isn't Left, Right or Middle.");
    return NULL;
  }
  return value;
}

static napi_value read_modifiers(napi_env env, napi_value value, modifier_list *modifiers) {
  bool is_array = false;
  uint32_t length = 0;
  uint32_t index;
  uint32_t other;
  CHECK(env, napi_is_array(env, value, &is_array));
  if (!is_array) {
    napi_throw_type_error(env, ERROR_CODE, "The modifiers aren't a list.");
    return NULL;
  }
  CHECK(env, napi_get_array_length(env, value, &length));
  if (length > MAX_MODIFIERS) {
    napi_throw_range_error(env, ERROR_CODE, "The call lists more modifiers than there are.");
    return NULL;
  }
  modifiers->count = 0;
  for (index = 0; index < length; index++) {
    napi_value item;
    char name[MAX_NAME];
    WORD key = 0;
    CHECK(env, napi_get_element(env, value, index, &item));
    if (read_name(env, item, name) == NULL)
      return NULL;
    if (!find_named_key(MODIFIER_NAMES, sizeof MODIFIER_NAMES / sizeof MODIFIER_NAMES[0], name, &key)) {
      napi_throw_range_error(env, ERROR_CODE, "A modifier isn't Shift, Control, Alt or Meta.");
      return NULL;
    }
    for (other = 0; other < modifiers->count; other++)
      if (modifiers->keys[other] == key) {
        napi_throw_range_error(env, ERROR_CODE, "A modifier is listed twice.");
        return NULL;
      }
    modifiers->keys[modifiers->count++] = key;
  }
  return value;
}

static napi_value read_key(napi_env env, napi_value value, WORD *key) {
  char name[MAX_NAME];
  size_t length;
  if (read_name(env, value, name) == NULL)
    return NULL;
  length = strlen(name);
  if (find_named_key(KEY_NAMES, sizeof KEY_NAMES / sizeof KEY_NAMES[0], name, key))
    return value;
  if (length == 1 && name[0] >= 'A' && name[0] <= 'Z') {
    *key = (WORD)name[0];
    return value;
  }
  if (length == 6 && strncmp(name, "Digit", 5) == 0 && name[5] >= '0' && name[5] <= '9') {
    *key = (WORD)name[5];
    return value;
  }
  if (name[0] == 'F' && ((length == 2 && name[1] >= '1' && name[1] <= '9') || (length == 3 && name[1] == '1' && name[2] >= '0' && name[2] <= '2'))) {
    *key = (WORD)(VK_F1 + atoi(name + 1) - 1);
    return value;
  }
  napi_throw_range_error(env, ERROR_CODE, "The key isn't a key name the module knows.");
  return NULL;
}

static napi_value refuse_or_open(napi_env env, const char *reason, input_batch *batch, UINT capacity) {
  if (reason != NULL)
    return make_outcome(env, reason, FALSE);
  if (!open_batch(batch, capacity))
    return throw_windows(env, "The input events couldn't be prepared.");
  return NULL;
}

static napi_value read_stop(napi_env env, napi_value value, pointer_job *job) {
  bool is_typed_array = false;
  bool is_plain = true;
  napi_typedarray_type type = napi_int8_array;
  size_t length = 0;
  void *data = NULL;
  napi_value buffer = NULL;
  CHECK(env, napi_is_typedarray(env, value, &is_typed_array));
  if (is_typed_array) {
    CHECK(env, napi_get_typedarray_info(env, value, &type, &length, &data, &buffer, NULL));
    CHECK(env, napi_is_arraybuffer(env, buffer, &is_plain));
  }
  if (!is_typed_array || is_plain || type != napi_int32_array || length < 1 || data == NULL) {
    napi_throw_type_error(env, ERROR_CODE, "The drag's stop isn't an Int32Array over a SharedArrayBuffer.");
    return NULL;
  }
  CHECK(env, napi_create_reference(env, value, 1, &job->stop_ref));
  job->stop = (volatile LONG *)data;
  return value;
}

static BOOL is_stop_set(pointer_job *job) {
  return job->stop != NULL && InterlockedCompareExchange(job->stop, 0, 0) != 0;
}

static void free_pointer_job(napi_env env, pointer_job *job) {
  if (job->stop_ref != NULL)
    napi_delete_reference(env, job->stop_ref);
  free(job->steps);
  free(job);
}

static napi_value read_steps(napi_env env, napi_value value, glide_step **steps, uint32_t *count) {
  bool is_array = false;
  uint32_t length = 0;
  uint32_t index;
  CHECK(env, napi_is_array(env, value, &is_array));
  if (!is_array) {
    napi_throw_type_error(env, ERROR_CODE, "The glide's steps aren't a list.");
    return NULL;
  }
  CHECK(env, napi_get_array_length(env, value, &length));
  if (length > MAX_GLIDE_STEPS) {
    napi_throw_range_error(env, ERROR_CODE, "The glide has more steps than it may.");
    return NULL;
  }
  *steps = (glide_step *)calloc(length > 0 ? length : 1, sizeof(glide_step));
  if (*steps == NULL) {
    napi_throw_error(env, ERROR_CODE, "The glide's memory couldn't be allocated.");
    return NULL;
  }
  *count = length;
  for (index = 0; index < length; index++) {
    napi_value item;
    napi_value x;
    napi_value y;
    napi_value at;
    uint32_t at_ms = 0;
    CHECK(env, napi_get_element(env, value, index, &item));
    CHECK(env, napi_get_named_property(env, item, "x", &x));
    CHECK(env, napi_get_named_property(env, item, "y", &y));
    CHECK(env, napi_get_named_property(env, item, "atMs", &at));
    if (read_point(env, x, y, &(*steps)[index].point) == NULL)
      return NULL;
    CHECK(env, napi_get_value_uint32(env, at, &at_ms));
    if (at_ms > MAX_GLIDE_MS || (index > 0 && at_ms < (*steps)[index - 1].at_ms)) {
      napi_throw_range_error(env, ERROR_CODE, "The glide's steps aren't in time order within its longest time.");
      return NULL;
    }
    (*steps)[index].at_ms = at_ms;
  }
  return value;
}

static napi_value read_points(napi_env env, napi_value value, POINT *points, size_t *count) {
  bool is_array = false;
  uint32_t length = 0;
  uint32_t index;
  CHECK(env, napi_is_array(env, value, &is_array));
  if (!is_array) {
    napi_throw_type_error(env, ERROR_CODE, "The input's points aren't a list.");
    return NULL;
  }
  CHECK(env, napi_get_array_length(env, value, &length));
  if (length < 1 || length > MAX_INPUT_POINTS) {
    napi_throw_range_error(env, ERROR_CODE, "The input has no point, or more than two.");
    return NULL;
  }
  for (index = 0; index < length; index++) {
    napi_value item;
    napi_value x;
    napi_value y;
    CHECK(env, napi_get_element(env, value, index, &item));
    CHECK(env, napi_get_named_property(env, item, "x", &x));
    CHECK(env, napi_get_named_property(env, item, "y", &y));
    if (read_point(env, x, y, &points[index]) == NULL)
      return NULL;
  }
  *count = length;
  return value;
}

static double elapsed_ms(LARGE_INTEGER start, LARGE_INTEGER frequency) {
  LARGE_INTEGER now;
  QueryPerformanceCounter(&now);
  return (double)(now.QuadPart - start.QuadPart) * 1000.0 / (double)frequency.QuadPart;
}

static void wait_ms(HANDLE timer, double ms) {
  LARGE_INTEGER due;
  if (ms <= 0)
    return;
  due.QuadPart = -(LONGLONG)(ms * 10000.0);
  if (timer == NULL || !SetWaitableTimer(timer, &due, 0, NULL, NULL, FALSE) || WaitForSingleObject(timer, INFINITE) != WAIT_OBJECT_0)
    Sleep((DWORD)ms + 1);
}

static BOOL send_move(POINT at) {
  input_batch batch;
  BOOL is_sent;
  if (!open_batch(&batch, 1))
    return FALSE;
  add_mouse(&batch, at, 0, 0);
  is_sent = SendInput(batch.count, batch.items, sizeof(INPUT)) == batch.count;
  close_batch(&batch);
  return is_sent;
}

static const char *run_glide(pointer_job *job, const POINT *points, size_t point_count, POINT *at) {
  HANDLE timer = CreateWaitableTimerExW(NULL, NULL, CREATE_WAITABLE_TIMER_HIGH_RESOLUTION, TIMER_ALL_ACCESS);
  LARGE_INTEGER frequency;
  LARGE_INTEGER start;
  const char *reason = NULL;
  uint32_t index;
  QueryPerformanceFrequency(&frequency);
  QueryPerformanceCounter(&start);
  for (index = 0; index < job->step_count && reason == NULL && job->error[0] == '\0' && !job->is_stopped; index++) {
    double now = elapsed_ms(start, frequency);
    if (index + 1 < job->step_count && job->steps[index + 1].at_ms <= now)
      continue;
    wait_ms(timer, job->steps[index].at_ms - now);
    if (is_stop_set(job)) {
      job->is_stopped = TRUE;
      break;
    }
    reason = check_target(&job->target, points, point_count, 0);
    if (reason == NULL && read_physical_count() != job->physical_before)
      reason = REASON_PHYSICAL_INPUT;
    if (reason == NULL && send_move(job->steps[index].point))
      *at = job->steps[index].point;
    else if (reason == NULL)
      strcpy_s(job->error, MAX_ERROR_TEXT, "Windows didn't insert the pointer's move; another thread blocks input.");
  }
  if (timer != NULL)
    CloseHandle(timer);
  return reason;
}

static void run_drag(pointer_job *job) {
  input_batch press;
  input_batch release;
  POINT at = job->points[0];
  BOOL is_ended;
  BOOL is_pressed = FALSE;
  if (is_stop_set(job)) {
    job->is_stopped = TRUE;
    return;
  }
  job->reason = check_target(&job->target, job->points, job->point_count, 0);
  if (job->reason == NULL && read_physical_count() != job->physical_before)
    job->reason = REASON_PHYSICAL_INPUT;
  if (job->reason != NULL)
    return;
  if (!open_batch(&press, 1 + MAX_MODIFIERS + 1)) {
    strcpy_s(job->error, MAX_ERROR_TEXT, "The input events couldn't be prepared.");
    return;
  }
  if (!open_batch(&release, 1 + MAX_MODIFIERS)) {
    close_batch(&press);
    strcpy_s(job->error, MAX_ERROR_TEXT, "The input events couldn't be prepared.");
    return;
  }
  add_mouse(&press, at, 0, 0);
  add_modifiers(&press, &job->modifiers, FALSE);
  add_mouse(&press, at, job->down, 0);
  job->is_stopped = is_stop_set(job);
  if (!job->is_stopped)
    job->reason = send_batch(&job->target, &press, job->physical_before, &job->modifiers, job->up, 0, at, job->error, &is_pressed);
  if (is_pressed) {
    job->input_sent = TRUE;
    if (job->reason == NULL)
      job->reason = run_glide(job, &job->points[1], 1, &at);
    is_ended = job->reason == NULL && job->error[0] == '\0' && !job->is_stopped;
    if (is_ended)
      at = job->points[1];
    add_releases(&release, &job->modifiers, job->up, 0, at);
    if (is_ended && insert_batch(&release, &job->modifiers, job->up, 0, at, job->error))
      job->reason = check_after_send(&job->target, job->physical_before);
    else if (!is_ended)
      SendInput(release.count, release.items, sizeof(INPUT));
  }
  close_batch(&release);
  close_batch(&press);
}

static void execute_pointer_job(napi_env env, void *data) {
  pointer_job *job = (pointer_job *)data;
  DPI_AWARENESS_CONTEXT previous = enter_physical_pixels();
  POINT at;
  (void)env;
  if (job->is_drag)
    run_drag(job);
  else
    job->reason = run_glide(job, job->points, job->point_count, &at);
  SetThreadDpiAwarenessContext(previous);
}

static void reject_error(napi_env env, napi_deferred deferred, const char *text) {
  napi_value code;
  napi_value message;
  napi_value error;
  bool pending = false;
  if (napi_is_exception_pending(env, &pending) == napi_ok && pending) {
    if (napi_get_and_clear_last_exception(env, &error) != napi_ok)
      return;
  } else if (napi_create_string_utf8(env, ERROR_CODE, NAPI_AUTO_LENGTH, &code) != napi_ok
    || napi_create_string_utf8(env, text, NAPI_AUTO_LENGTH, &message) != napi_ok
    || napi_create_error(env, code, message, &error) != napi_ok)
    return;
  napi_reject_deferred(env, deferred, error);
}

static void complete_pointer_job(napi_env env, napi_status status, void *data) {
  pointer_job *job = (pointer_job *)data;
  napi_value outcome = NULL;
  if (status == napi_ok && job->error[0] == '\0')
    outcome = job->is_stopped ? make_stopped_outcome(env, job->input_sent) : make_outcome(env, job->reason, job->input_sent);
  if (outcome != NULL)
    napi_resolve_deferred(env, job->deferred, outcome);
  else
    reject_error(env, job->deferred, job->error[0] != '\0' ? job->error : "The input's outcome couldn't be handed over.");
  napi_delete_async_work(env, job->work);
  free_pointer_job(env, job);
}

static napi_value queue_pointer_job(napi_env env, pointer_job *job, const char *name) {
  napi_value resource_name;
  napi_value promise;
  if (napi_create_string_utf8(env, name, NAPI_AUTO_LENGTH, &resource_name) != napi_ok
    || napi_create_async_work(env, NULL, resource_name, execute_pointer_job, complete_pointer_job, job, &job->work) != napi_ok) {
    free_pointer_job(env, job);
    throw_pending(env);
    return NULL;
  }
  if (napi_create_promise(env, &job->deferred, &promise) != napi_ok || napi_queue_async_work(env, job->work) != napi_ok) {
    napi_delete_async_work(env, job->work);
    free_pointer_job(env, job);
    throw_pending(env);
    return NULL;
  }
  return promise;
}

static napi_value read_pointer(napi_env env, napi_callback_info info) {
  POINT at;
  napi_value result;
  DPI_AWARENESS_CONTEXT previous;
  BOOL read;
  (void)info;
  previous = enter_physical_pixels();
  read = GetCursorPos(&at);
  SetThreadDpiAwarenessContext(previous);
  if (!read)
    return throw_windows(env, "Windows couldn't read where the pointer is.");
  CHECK(env, napi_create_object(env, &result));
  CHECK(env, set_number(env, result, "x", at.x));
  CHECK(env, set_number(env, result, "y", at.y));
  return result;
}

static napi_value glide_pointer(napi_env env, napi_callback_info info) {
  napi_value arguments[3];
  pointer_job *job = (pointer_job *)calloc(1, sizeof(pointer_job));
  if (job == NULL) {
    napi_throw_error(env, ERROR_CODE, "The glide's memory couldn't be allocated.");
    return NULL;
  }
  job->physical_before = read_physical_count_at_call();
  if (read_arguments(env, info, 3, arguments) == NULL || read_target(env, arguments[0], &job->target) == NULL
      || read_steps(env, arguments[1], &job->steps, &job->step_count) == NULL || read_points(env, arguments[2], job->points, &job->point_count) == NULL) {
    free_pointer_job(env, job);
    return NULL;
  }
  return queue_pointer_job(env, job, "glidePointer");
}

static napi_value move_pointer(napi_env env, napi_callback_info info) {
  napi_value arguments[3];
  target_window target;
  POINT at;
  input_batch batch;
  napi_value outcome;
  LONG physical_before = read_physical_count_at_call();
  DPI_AWARENESS_CONTEXT previous;
  batch.items = NULL;
  if (read_arguments(env, info, 3, arguments) == NULL || read_target(env, arguments[0], &target) == NULL || read_point(env, arguments[1], arguments[2], &at) == NULL)
    return NULL;
  previous = enter_physical_pixels();
  outcome = refuse_or_open(env, check_target(&target, &at, 1, 0), &batch, 1);
  if (outcome == NULL && batch.items != NULL) {
    add_mouse(&batch, at, 0, 0);
    outcome = finish_send(env, &target, &batch, physical_before, &NO_MODIFIERS, 0, 0, at);
    close_batch(&batch);
  }
  SetThreadDpiAwarenessContext(previous);
  return outcome;
}

static napi_value click(napi_env env, napi_callback_info info) {
  napi_value arguments[6];
  target_window target;
  POINT at;
  uint32_t count = 0;
  modifier_list modifiers;
  DWORD down = 0;
  DWORD up = 0;
  uint32_t index;
  input_batch batch;
  napi_value outcome;
  LONG physical_before = read_physical_count_at_call();
  DPI_AWARENESS_CONTEXT previous;
  batch.items = NULL;
  if (read_arguments(env, info, 6, arguments) == NULL || read_target(env, arguments[0], &target) == NULL || read_point(env, arguments[1], arguments[2], &at) == NULL)
    return NULL;
  if (read_button(env, arguments[3], &down, &up) == NULL || read_modifiers(env, arguments[5], &modifiers) == NULL)
    return NULL;
  CHECK(env, napi_get_value_uint32(env, arguments[4], &count));
  if (count < 1 || count > 3) {
    napi_throw_range_error(env, ERROR_CODE, "The click count isn't 1, 2 or 3.");
    return NULL;
  }
  previous = enter_physical_pixels();
  outcome = refuse_or_open(env, check_target(&target, &at, 1, 0), &batch, 1 + 4 + 2 * count + 4);
  if (outcome == NULL && batch.items != NULL) {
    add_mouse(&batch, at, 0, 0);
    add_modifiers(&batch, &modifiers, FALSE);
    for (index = 0; index < count; index++) {
      add_mouse(&batch, at, down, 0);
      add_mouse(&batch, at, up, 0);
    }
    add_modifiers(&batch, &modifiers, TRUE);
    outcome = finish_send(env, &target, &batch, physical_before, &modifiers, up, 0, at);
    close_batch(&batch);
  }
  SetThreadDpiAwarenessContext(previous);
  return outcome;
}

static napi_value drag(napi_env env, napi_callback_info info) {
  napi_value arguments[9];
  pointer_job *job = (pointer_job *)calloc(1, sizeof(pointer_job));
  if (job == NULL) {
    napi_throw_error(env, ERROR_CODE, "The drag's memory couldn't be allocated.");
    return NULL;
  }
  job->is_drag = TRUE;
  job->point_count = 2;
  job->physical_before = read_physical_count_at_call();
  if (read_arguments(env, info, 9, arguments) == NULL || read_target(env, arguments[0], &job->target) == NULL
      || read_point(env, arguments[1], arguments[2], &job->points[0]) == NULL || read_point(env, arguments[3], arguments[4], &job->points[1]) == NULL
      || read_steps(env, arguments[5], &job->steps, &job->step_count) == NULL
      || read_button(env, arguments[6], &job->down, &job->up) == NULL || read_modifiers(env, arguments[7], &job->modifiers) == NULL
      || read_stop(env, arguments[8], job) == NULL) {
    free_pointer_job(env, job);
    return NULL;
  }
  return queue_pointer_job(env, job, "drag");
}

static napi_value scroll(napi_env env, napi_callback_info info) {
  napi_value arguments[6];
  target_window target;
  POINT at;
  int32_t delta_x = 0;
  int32_t delta_y = 0;
  modifier_list modifiers;
  input_batch batch;
  napi_value outcome;
  LONG physical_before = read_physical_count_at_call();
  DPI_AWARENESS_CONTEXT previous;
  batch.items = NULL;
  if (read_arguments(env, info, 6, arguments) == NULL || read_target(env, arguments[0], &target) == NULL || read_point(env, arguments[1], arguments[2], &at) == NULL)
    return NULL;
  CHECK(env, napi_get_value_int32(env, arguments[3], &delta_x));
  CHECK(env, napi_get_value_int32(env, arguments[4], &delta_y));
  if (delta_x < -MAX_SCROLL_NOTCHES || delta_x > MAX_SCROLL_NOTCHES || delta_y < -MAX_SCROLL_NOTCHES || delta_y > MAX_SCROLL_NOTCHES) {
    napi_throw_range_error(env, ERROR_CODE, "The scroll is more than 50 notches along an axis.");
    return NULL;
  }
  if (read_modifiers(env, arguments[5], &modifiers) == NULL)
    return NULL;
  previous = enter_physical_pixels();
  outcome = refuse_or_open(env, check_target(&target, &at, 1, 0), &batch, 1 + 4 + 2 + 4);
  if (outcome == NULL && batch.items != NULL) {
    add_mouse(&batch, at, 0, 0);
    add_modifiers(&batch, &modifiers, FALSE);
    if (delta_y != 0)
      add_mouse(&batch, at, MOUSEEVENTF_WHEEL, (DWORD)(-delta_y * WHEEL_DELTA));
    if (delta_x != 0)
      add_mouse(&batch, at, MOUSEEVENTF_HWHEEL, (DWORD)(delta_x * WHEEL_DELTA));
    add_modifiers(&batch, &modifiers, TRUE);
    outcome = finish_send(env, &target, &batch, physical_before, &modifiers, 0, 0, at);
    close_batch(&batch);
  }
  SetThreadDpiAwarenessContext(previous);
  return outcome;
}

static WORD key_of_unit(WCHAR unit) {
  return unit == L'\n' || unit == L'\r' ? VK_RETURN : unit == L'\t' ? VK_TAB : 0;
}

static size_t units_of_key(const WCHAR *text, size_t index, size_t length) {
  return text[index] == L'\r' && index + 1 < length && text[index + 1] == L'\n' ? 2 : 1;
}

static napi_value read_focus_budget(napi_env env, napi_value value, DWORD *focus_ms) {
  uint32_t budget = 0;
  CHECK(env, napi_get_value_uint32(env, value, &budget));
  if (budget == 0 || budget > MAX_CONTROL_TIMEOUT_MS) {
    napi_throw_range_error(env, ERROR_CODE, "The focus budget must be from 1 to 60,000 milliseconds.");
    return NULL;
  }
  *focus_ms = budget;
  return value;
}

static napi_value type_text(napi_env env, napi_callback_info info) {
  napi_value arguments[3];
  target_window target;
  DWORD focus_ms = 0;
  WCHAR text[MAX_TEXT_UNITS + 1];
  size_t length = 0;
  size_t end = 0;
  size_t index;
  POINT nowhere = { 0, 0 };
  input_batch batch;
  char error[MAX_ERROR_TEXT];
  const char *reason;
  BOOL is_sent = FALSE;
  napi_value outcome;
  LONG physical_before = read_physical_count_at_call();
  DPI_AWARENESS_CONTEXT previous;
  batch.items = NULL;
  if (read_arguments(env, info, 3, arguments) == NULL || read_target(env, arguments[0], &target) == NULL
      || read_focus_budget(env, arguments[2], &focus_ms) == NULL)
    return NULL;
  CHECK(env, napi_get_value_string_utf16(env, arguments[1], NULL, 0, &length));
  if (length == 0 || length > MAX_TEXT_UNITS) {
    napi_throw_range_error(env, ERROR_CODE, "The text chunk is empty or longer than the addon takes.");
    return NULL;
  }
  CHECK(env, napi_get_value_string_utf16(env, arguments[1], (char16_t *)text, MAX_TEXT_UNITS + 1, &length));
  while (end < length && key_of_unit(text[end]) == 0)
    end++;
  if (end < length)
    end += units_of_key(text, end, length);
  previous = enter_physical_pixels();
  outcome = refuse_or_open(env, check_target(&target, NULL, 0, focus_ms), &batch, (UINT)(2 * end));
  if (outcome == NULL && batch.items != NULL) {
    for (index = 0; index < end; index++) {
      WORD key = key_of_unit(text[index]);
      if (key != 0) {
        add_key(&batch, key, FALSE);
        add_key(&batch, key, TRUE);
        index += units_of_key(text, index, end) - 1;
      } else {
        add_unit(&batch, text[index], FALSE);
        add_unit(&batch, text[index], TRUE);
      }
    }
    reason = send_batch(&target, &batch, physical_before, &NO_MODIFIERS, 0, 0, nowhere, error, &is_sent);
    close_batch(&batch);
    if (error[0] != '\0')
      napi_throw_error(env, ERROR_CODE, error);
    else
      outcome = make_outcome(env, reason != NULL ? reason : end < length ? REASON_PASSWORD_FIELD : NULL, is_sent);
  }
  SetThreadDpiAwarenessContext(previous);
  return outcome;
}

static napi_value press_key(napi_env env, napi_callback_info info) {
  napi_value arguments[4];
  target_window target;
  DWORD focus_ms = 0;
  WORD key = 0;
  modifier_list modifiers;
  POINT nowhere = { 0, 0 };
  input_batch batch;
  napi_value outcome;
  LONG physical_before = read_physical_count_at_call();
  DPI_AWARENESS_CONTEXT previous;
  batch.items = NULL;
  if (read_arguments(env, info, 4, arguments) == NULL || read_target(env, arguments[0], &target) == NULL)
    return NULL;
  if (read_key(env, arguments[1], &key) == NULL || read_modifiers(env, arguments[2], &modifiers) == NULL
      || read_focus_budget(env, arguments[3], &focus_ms) == NULL)
    return NULL;
  previous = enter_physical_pixels();
  outcome = refuse_or_open(env, check_target(&target, NULL, 0, focus_ms), &batch, 4 + 2 + 4);
  if (outcome == NULL && batch.items != NULL) {
    add_modifiers(&batch, &modifiers, FALSE);
    add_key(&batch, key, FALSE);
    add_key(&batch, key, TRUE);
    add_modifiers(&batch, &modifiers, TRUE);
    outcome = finish_send(env, &target, &batch, physical_before, &modifiers, 0, key, nowhere);
    close_batch(&batch);
  }
  SetThreadDpiAwarenessContext(previous);
  return outcome;
}

static BOOL CALLBACK add_display(HMONITOR monitor, HDC context, LPRECT bounds, LPARAM data) {
  display_list *list = (display_list *)data;
  MONITORINFOEXW monitor_info;
  UINT dpi_x = 0;
  UINT dpi_y = 0;
  napi_value item;
  (void)context;
  (void)bounds;
  monitor_info.cbSize = sizeof monitor_info;
  if (!GetMonitorInfoW(monitor, (MONITORINFO *)&monitor_info) || FAILED(GetDpiForMonitor(monitor, MDT_EFFECTIVE_DPI, &dpi_x, &dpi_y))) {
    list->status = napi_generic_failure;
    return FALSE;
  }
  if ((list->status = napi_create_object(list->env, &item)) != napi_ok
      || (list->status = set_text(list->env, item, "id", monitor_info.szDevice, NAPI_AUTO_LENGTH)) != napi_ok
      || (list->status = set_number(list->env, item, "x", monitor_info.rcMonitor.left)) != napi_ok
      || (list->status = set_number(list->env, item, "y", monitor_info.rcMonitor.top)) != napi_ok
      || (list->status = set_number(list->env, item, "width", monitor_info.rcMonitor.right - monitor_info.rcMonitor.left)) != napi_ok
      || (list->status = set_number(list->env, item, "height", monitor_info.rcMonitor.bottom - monitor_info.rcMonitor.top)) != napi_ok
      || (list->status = set_number(list->env, item, "dpi", dpi_x)) != napi_ok
      || (list->status = set_boolean(list->env, item, "isPrimary", (monitor_info.dwFlags & MONITORINFOF_PRIMARY) != 0)) != napi_ok
      || (list->status = napi_set_element(list->env, list->array, list->count++, item)) != napi_ok)
    return FALSE;
  return TRUE;
}

static napi_value list_displays(napi_env env, napi_callback_info info) {
  display_list list;
  DPI_AWARENESS_CONTEXT previous;
  BOOL listed;
  (void)info;
  list.env = env;
  list.count = 0;
  list.status = napi_ok;
  CHECK(env, napi_create_array(env, &list.array));
  previous = enter_physical_pixels();
  listed = EnumDisplayMonitors(NULL, NULL, add_display, (LPARAM)&list);
  SetThreadDpiAwarenessContext(previous);
  if (list.status != napi_ok) {
    throw_pending(env);
    return NULL;
  }
  if (!listed)
    return throw_windows(env, "Windows couldn't list the displays.");
  return list.array;
}

static napi_value get_foreground_window(napi_env env, napi_callback_info info) {
  HWND front;
  window_facts facts;
  WCHAR window_id[MAX_WINDOW_ID];
  WCHAR class_name[MAX_CLASS_NAME];
  int class_length = 0;
  napi_value result;
  DPI_AWARENESS_CONTEXT previous;
  BOOL read;
  (void)info;
  previous = enter_physical_pixels();
  front = GetForegroundWindow();
  read = front != NULL && read_window(GetAncestor(front, GA_ROOT), &facts);
  if (read)
    class_length = GetClassNameW(facts.window, class_name, MAX_CLASS_NAME);
  SetThreadDpiAwarenessContext(previous);
  if (!read) {
    CHECK(env, napi_get_null(env, &result));
    return result;
  }
  _snwprintf_s(window_id, MAX_WINDOW_ID, _TRUNCATE, L"%llu", (unsigned long long)(uintptr_t)facts.window);
  CHECK(env, napi_create_object(env, &result));
  CHECK(env, set_text(env, result, "windowId", window_id, NAPI_AUTO_LENGTH));
  CHECK(env, set_number(env, result, "processId", facts.process_id));
  CHECK(env, set_text(env, result, "imagePath", facts.image, facts.image_length));
  CHECK(env, set_text(env, result, "className", class_name, (size_t)class_length));
  CHECK(env, set_number(env, result, "x", facts.frame.left));
  CHECK(env, set_number(env, result, "y", facts.frame.top));
  CHECK(env, set_number(env, result, "width", facts.frame.right - facts.frame.left));
  CHECK(env, set_number(env, result, "height", facts.frame.bottom - facts.frame.top));
  CHECK(env, set_boolean(env, result, "isElevated", facts.rights != RIGHTS_NOT_ABOVE));
  return result;
}

static BOOL is_shown_window(HWND window) {
  DWORD cloaked = 0;
  if (!IsWindowVisible(window) || IsIconic(window))
    return FALSE;
  return FAILED(DwmGetWindowAttribute(window, DWMWA_CLOAKED, &cloaked, sizeof cloaked)) || cloaked == 0;
}

static DWORD read_image(DWORD process_id, WCHAR *image) {
  DWORD length = MAX_IMAGE_PATH;
  HANDLE process = process_id != 0 ? OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, process_id) : NULL;
  if (process == NULL)
    return 0;
  if (!QueryFullProcessImageNameW(process, 0, image, &length))
    length = 0;
  CloseHandle(process);
  return length;
}

static BOOL read_shown_frame(HWND window, RECT *frame) {
  return SUCCEEDED(DwmGetWindowAttribute(window, DWMWA_EXTENDED_FRAME_BOUNDS, frame, sizeof *frame)) || GetWindowRect(window, frame);
}

static BOOL add_stacked(HWND window, window_list *list) {
  RECT frame;
  WCHAR window_id[MAX_WINDOW_ID];
  DWORD process_id = 0;
  WCHAR image[MAX_IMAGE_PATH];
  DWORD image_length;
  WCHAR class_name[MAX_CLASS_NAME];
  int class_length;
  napi_value item;
  if (!is_shown_window(window))
    return TRUE;
  if (border_thread_id != 0 && GetWindowThreadProcessId(window, NULL) == border_thread_id)
    return TRUE;
  if (!read_shown_frame(window, &frame)) {
    list->is_complete = FALSE;
    return TRUE;
  }
  if (frame.right <= frame.left || frame.bottom <= frame.top)
    return TRUE;
  GetWindowThreadProcessId(window, &process_id);
  image_length = read_image(process_id, image);
  class_length = GetClassNameW(window, class_name, MAX_CLASS_NAME);
  _snwprintf_s(window_id, MAX_WINDOW_ID, _TRUNCATE, L"%llu", (unsigned long long)(uintptr_t)window);
  list->status = napi_create_object(list->env, &item);
  if (list->status == napi_ok)
    list->status = set_text(list->env, item, "windowId", window_id, NAPI_AUTO_LENGTH);
  if (list->status == napi_ok)
    list->status = set_text(list->env, item, "imagePath", image, image_length);
  if (list->status == napi_ok)
    list->status = set_text(list->env, item, "className", class_name, (size_t)class_length);
  if (list->status == napi_ok)
    list->status = set_number(list->env, item, "x", frame.left);
  if (list->status == napi_ok)
    list->status = set_number(list->env, item, "y", frame.top);
  if (list->status == napi_ok)
    list->status = set_number(list->env, item, "width", frame.right - frame.left);
  if (list->status == napi_ok)
    list->status = set_number(list->env, item, "height", frame.bottom - frame.top);
  if (list->status == napi_ok)
    list->status = napi_set_element(list->env, list->array, list->count, item);
  if (list->status == napi_ok)
    list->count += 1;
  return list->status == napi_ok;
}

static void walk_stacked(window_list *list) {
  HWND window = NULL;
  HWND next;
  DWORD walked;
  for (walked = 0; walked < MAX_LISTED_WINDOWS; walked++) {
    next = FindWindowExW(NULL, window, NULL, NULL);
    if (next == NULL) {
      if (window != NULL && !IsWindow(window))
        list->is_complete = FALSE;
      return;
    }
    if (!add_stacked(next, list))
      return;
    window = next;
  }
  list->is_complete = FALSE;
}

static napi_value list_windows(napi_env env, napi_callback_info info) {
  window_list list;
  napi_value result;
  DPI_AWARENESS_CONTEXT previous;
  (void)info;
  list.env = env;
  list.count = 0;
  list.is_complete = TRUE;
  list.status = napi_ok;
  CHECK(env, napi_create_array(env, &list.array));
  previous = enter_physical_pixels();
  walk_stacked(&list);
  SetThreadDpiAwarenessContext(previous);
  if (list.status != napi_ok) {
    throw_pending(env);
    return NULL;
  }
  CHECK(env, napi_create_object(env, &result));
  CHECK(env, set_boolean(env, result, "isComplete", list.is_complete));
  CHECK(env, napi_set_named_property(env, result, "windows", list.array));
  return result;
}

static BOOL claim_drawing(HWND window) {
  size_t index;
  size_t slot = DRAWING_SLOTS;
  BOOL is_drawing = FALSE;
  AcquireSRWLockExclusive(&drawing_lock);
  for (index = 0; index < DRAWING_SLOTS; index++) {
    if (drawing_windows[index] == window)
      is_drawing = TRUE;
    else if (drawing_windows[index] == NULL && slot == DRAWING_SLOTS)
      slot = index;
  }
  if (!is_drawing && slot < DRAWING_SLOTS)
    drawing_windows[slot] = window;
  ReleaseSRWLockExclusive(&drawing_lock);
  return !is_drawing && slot < DRAWING_SLOTS;
}

static void release_drawing(HWND window) {
  size_t index;
  AcquireSRWLockExclusive(&drawing_lock);
  for (index = 0; index < DRAWING_SLOTS; index++)
    if (drawing_windows[index] == window)
      drawing_windows[index] = NULL;
  ReleaseSRWLockExclusive(&drawing_lock);
}

static void let_go_drawing(window_drawing *drawing) {
  if (InterlockedDecrement(&drawing->references) == 0) {
    free(drawing->pixels);
    free(drawing);
  }
}

static DWORD WINAPI run_drawing(LPVOID parameter) {
  window_drawing *drawing = (window_drawing *)parameter;
  RECT frame = drawing->frame;
  RECT outer = drawing->outer;
  size_t outer_width = (size_t)(outer.right - outer.left);
  size_t width = (size_t)(frame.right - frame.left);
  size_t height = (size_t)(frame.bottom - frame.top);
  BITMAPINFO bitmap_info;
  void *bits = NULL;
  uint8_t *pixels = NULL;
  HDC screen;
  HDC memory = NULL;
  HBITMAP bitmap = NULL;
  HGDIOBJ previous_object = NULL;
  size_t row;
  DPI_AWARENESS_CONTEXT previous = enter_physical_pixels();
  ZeroMemory(&bitmap_info, sizeof bitmap_info);
  bitmap_info.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
  bitmap_info.bmiHeader.biWidth = (LONG)outer_width;
  bitmap_info.bmiHeader.biHeight = -(outer.bottom - outer.top);
  bitmap_info.bmiHeader.biPlanes = 1;
  bitmap_info.bmiHeader.biBitCount = 32;
  bitmap_info.bmiHeader.biCompression = BI_RGB;
  screen = GetDC(NULL);
  memory = screen != NULL ? CreateCompatibleDC(screen) : NULL;
  bitmap = memory != NULL ? CreateDIBSection(screen, &bitmap_info, DIB_RGB_COLORS, &bits, NULL, 0) : NULL;
  previous_object = bitmap != NULL ? SelectObject(memory, bitmap) : NULL;
  if (previous_object != NULL && PrintWindow(drawing->window, memory, PW_RENDERFULLCONTENT) && GdiFlush())
    pixels = (uint8_t *)malloc(width * height * 4);
  if (pixels != NULL)
    for (row = 0; row < height; row++)
      memcpy(pixels + row * width * 4,
        (const uint8_t *)bits + (((size_t)(frame.top - outer.top) + row) * outer_width + (size_t)(frame.left - outer.left)) * 4, width * 4);
  if (previous_object != NULL)
    SelectObject(memory, previous_object);
  if (bitmap != NULL)
    DeleteObject(bitmap);
  if (memory != NULL)
    DeleteDC(memory);
  if (screen != NULL)
    ReleaseDC(NULL, screen);
  SetThreadDpiAwarenessContext(previous);
  drawing->pixels = pixels;
  release_drawing(drawing->window);
  let_go_drawing(drawing);
  return 0;
}

static void execute_capture(napi_env env, void *data) {
  window_capture *capture = (window_capture *)data;
  window_drawing *drawing = capture->drawing;
  HANDLE thread = CreateThread(NULL, 0, run_drawing, drawing, 0, NULL);
  (void)env;
  if (thread == NULL) {
    release_drawing(drawing->window);
    let_go_drawing(drawing);
  } else {
    if (WaitForSingleObject(thread, capture->timeout_ms) == WAIT_OBJECT_0) {
      capture->pixels = drawing->pixels;
      drawing->pixels = NULL;
    }
    CloseHandle(thread);
  }
  capture->drawing = NULL;
  let_go_drawing(drawing);
}

static void complete_capture(napi_env env, napi_status status, void *data) {
  window_capture *capture = (window_capture *)data;
  size_t size = (size_t)capture->width * (size_t)capture->height * 4;
  void *copy = NULL;
  napi_value buffer = NULL;
  napi_value result = NULL;
  BOOL is_ready;
  if (status == napi_ok && capture->pixels != NULL) {
    is_ready = napi_create_arraybuffer(env, size, &copy, &buffer) == napi_ok;
    if (is_ready)
      memcpy(copy, capture->pixels, size);
    is_ready = is_ready && napi_create_object(env, &result) == napi_ok && set_number(env, result, "width", capture->width) == napi_ok
      && set_number(env, result, "height", capture->height) == napi_ok && napi_set_named_property(env, result, "bgra", buffer) == napi_ok;
  } else
    is_ready = napi_get_null(env, &result) == napi_ok;
  if (is_ready)
    napi_resolve_deferred(env, capture->deferred, result);
  else
    reject_error(env, capture->deferred, "The window's image couldn't be handed over.");
  free(capture->pixels);
  napi_delete_async_work(env, capture->work);
  free(capture);
}

static napi_value resolve_null(napi_env env) {
  napi_value promise;
  napi_value result;
  napi_deferred deferred;
  CHECK(env, napi_create_promise(env, &deferred, &promise));
  CHECK(env, napi_get_null(env, &result));
  CHECK(env, napi_resolve_deferred(env, deferred, result));
  return promise;
}

static napi_value capture_window(napi_env env, napi_callback_info info) {
  napi_value arguments[6];
  char window_id[MAX_WINDOW_ID];
  size_t length = 0;
  char *end = NULL;
  unsigned long long handle;
  HWND window;
  int32_t x = 0;
  int32_t y = 0;
  int32_t width = 0;
  int32_t height = 0;
  int32_t timeout_ms = 0;
  RECT frame = { 0 };
  RECT outer = { 0 };
  BOOL placed;
  window_capture *capture;
  window_drawing *drawing;
  napi_value name;
  napi_value promise;
  DPI_AWARENESS_CONTEXT previous;
  if (read_arguments(env, info, 6, arguments) == NULL)
    return NULL;
  CHECK(env, napi_get_value_string_utf8(env, arguments[0], window_id, sizeof window_id, &length));
  handle = _strtoui64(window_id, &end, 10);
  if (length == 0 || *end != '\0') {
    napi_throw_type_error(env, ERROR_CODE, "The windowId isn't a decimal window handle.");
    return NULL;
  }
  CHECK(env, napi_get_value_int32(env, arguments[1], &x));
  CHECK(env, napi_get_value_int32(env, arguments[2], &y));
  CHECK(env, napi_get_value_int32(env, arguments[3], &width));
  CHECK(env, napi_get_value_int32(env, arguments[4], &height));
  CHECK(env, napi_get_value_int32(env, arguments[5], &timeout_ms));
  if (width < 1 || height < 1 || width > MAX_CAPTURE_SIDE || height > MAX_CAPTURE_SIDE) {
    napi_throw_range_error(env, ERROR_CODE, "The window's size is out of range.");
    return NULL;
  }
  if (timeout_ms < 1 || timeout_ms > MAX_CAPTURE_TIMEOUT_MS) {
    napi_throw_range_error(env, ERROR_CODE, "The capture's timeout is out of range.");
    return NULL;
  }
  window = (HWND)(uintptr_t)handle;
  previous = enter_physical_pixels();
  placed = IsWindow(window) && is_shown_window(window) && !IsHungAppWindow(window) && read_shown_frame(window, &frame) && GetWindowRect(window, &outer)
    && frame.left == x && frame.top == y && frame.right - frame.left == width && frame.bottom - frame.top == height
    && frame.left >= outer.left && frame.top >= outer.top && frame.right <= outer.right && frame.bottom <= outer.bottom
    && outer.right - outer.left <= MAX_CAPTURE_SIDE && outer.bottom - outer.top <= MAX_CAPTURE_SIDE;
  SetThreadDpiAwarenessContext(previous);
  if (!placed || !claim_drawing(window))
    return resolve_null(env);
  capture = (window_capture *)calloc(1, sizeof *capture);
  drawing = (window_drawing *)calloc(1, sizeof *drawing);
  if (capture == NULL || drawing == NULL) {
    release_drawing(window);
    free(capture);
    free(drawing);
    napi_throw_error(env, ERROR_CODE, "The capture's memory couldn't be allocated.");
    return NULL;
  }
  drawing->references = 2;
  drawing->window = window;
  drawing->frame = frame;
  drawing->outer = outer;
  capture->drawing = drawing;
  capture->timeout_ms = (DWORD)timeout_ms;
  capture->width = width;
  capture->height = height;
  if (napi_create_string_utf8(env, "captureWindow", NAPI_AUTO_LENGTH, &name) != napi_ok
    || napi_create_async_work(env, NULL, name, execute_capture, complete_capture, capture, &capture->work) != napi_ok) {
    release_drawing(window);
    free(capture);
    free(drawing);
    throw_pending(env);
    return NULL;
  }
  if (napi_create_promise(env, &capture->deferred, &promise) != napi_ok || napi_queue_async_work(env, capture->work) != napi_ok) {
    napi_delete_async_work(env, capture->work);
    release_drawing(window);
    free(capture);
    free(drawing);
    throw_pending(env);
    return NULL;
  }
  return promise;
}

static void flag_physical(LONG kind) {
  InterlockedIncrement(&physical_count);
  AcquireSRWLockShared(&callback_lock);
  if (physical_callback != NULL && InterlockedCompareExchange(&physical_pending[kind], 1, 0) == 0
      && napi_call_threadsafe_function(physical_callback, (void *)(intptr_t)kind, napi_tsfn_nonblocking) != napi_ok)
    InterlockedExchange(&physical_pending[kind], 0);
  ReleaseSRWLockShared(&callback_lock);
}

static LRESULT CALLBACK on_mouse(int code, WPARAM message, LPARAM data) {
  if (code == HC_ACTION && (((MSLLHOOKSTRUCT *)data)->flags & (LLMHF_INJECTED | LLMHF_LOWER_IL_INJECTED)) == 0)
    flag_physical(PHYSICAL_POINTER);
  return CallNextHookEx(NULL, code, message, data);
}

static void note_key_process(void) {
  DWORD process = 0;
  HWND window = GetForegroundWindow();
  LONG seen;
  LONG next;
  if (window != NULL)
    GetWindowThreadProcessId(window, &process);
  do {
    seen = InterlockedCompareExchange(&key_process, KEY_PROCESS_NONE, KEY_PROCESS_NONE);
    next = seen == KEY_PROCESS_NONE || seen == (LONG)process ? (LONG)process : KEY_PROCESS_UNKNOWN;
  } while (InterlockedCompareExchange(&key_process, next, seen) != seen);
}

static LRESULT CALLBACK on_keyboard(int code, WPARAM message, LPARAM data) {
  if (code == HC_ACTION && (((KBDLLHOOKSTRUCT *)data)->flags & (LLKHF_INJECTED | LLKHF_LOWER_IL_INJECTED)) == 0) {
    note_key_process();
    flag_physical(PHYSICAL_KEYBOARD);
  }
  return CallNextHookEx(NULL, code, message, data);
}

static void post_heartbeat(void) {
  LONG sequence = ++heartbeat_sequence;
  AcquireSRWLockShared(&callback_lock);
  if (heartbeat_callback != NULL && InterlockedCompareExchange(&heartbeat_pending, 1, 0) == 0
      && napi_call_threadsafe_function(heartbeat_callback, (void *)(intptr_t)sequence, napi_tsfn_nonblocking) != napi_ok)
    InterlockedExchange(&heartbeat_pending, 0);
  ReleaseSRWLockShared(&callback_lock);
}

static DWORD WINAPI run_monitor(LPVOID started) {
  MSG message;
  HMODULE module = NULL;
  HHOOK mouse = NULL;
  HHOOK keyboard = NULL;
  UINT_PTR timer = 0;
  PeekMessageW(&message, NULL, WM_USER, WM_USER, PM_NOREMOVE);
  GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT, (LPCWSTR)(void *)on_mouse, &module);
  mouse = SetWindowsHookExW(WH_MOUSE_LL, on_mouse, module, 0);
  keyboard = mouse != NULL ? SetWindowsHookExW(WH_KEYBOARD_LL, on_keyboard, module, 0) : NULL;
  timer = keyboard != NULL ? SetTimer(NULL, 0, heartbeat_interval, NULL) : 0;
  monitor_hooked = timer != 0;
  SetEvent((HANDLE)started);
  if (monitor_hooked) {
    post_heartbeat();
    while (GetMessageW(&message, NULL, 0, 0) > 0)
      if (message.message == WM_TIMER)
        post_heartbeat();
    KillTimer(NULL, timer);
  }
  if (keyboard != NULL)
    UnhookWindowsHookEx(keyboard);
  if (mouse != NULL)
    UnhookWindowsHookEx(mouse);
  return 0;
}

static void call_physical(napi_env env, napi_value callback, void *context, void *data) {
  napi_value values[2];
  napi_value global;
  LONG process = KEY_PROCESS_UNKNOWN;
  (void)context;
  InterlockedExchange(&physical_pending[(intptr_t)data], 0);
  if ((intptr_t)data == PHYSICAL_KEYBOARD) {
    process = InterlockedExchange(&key_process, KEY_PROCESS_NONE);
    if (process == KEY_PROCESS_NONE)
      return;
  }
  if (env == NULL || napi_create_int32(env, (int32_t)(intptr_t)data, &values[0]) != napi_ok
      || napi_create_uint32(env, (uint32_t)process, &values[1]) != napi_ok || napi_get_global(env, &global) != napi_ok)
    return;
  napi_call_function(env, global, callback, 2, values, NULL);
}

static void call_heartbeat(napi_env env, napi_value callback, void *context, void *data) {
  napi_value sequence;
  napi_value global;
  (void)context;
  InterlockedExchange(&heartbeat_pending, 0);
  if (env == NULL || napi_create_int32(env, (int32_t)(intptr_t)data, &sequence) != napi_ok || napi_get_global(env, &global) != napi_ok)
    return;
  napi_call_function(env, global, callback, 1, &sequence, NULL);
}

static void release_callbacks(void) {
  AcquireSRWLockExclusive(&callback_lock);
  if (physical_callback != NULL)
    napi_release_threadsafe_function(physical_callback, napi_tsfn_release);
  if (heartbeat_callback != NULL)
    napi_release_threadsafe_function(heartbeat_callback, napi_tsfn_release);
  physical_callback = NULL;
  heartbeat_callback = NULL;
  ReleaseSRWLockExclusive(&callback_lock);
}

static BOOL end_monitor(void) {
  if (monitor_thread == NULL)
    return TRUE;
  PostThreadMessageW(monitor_thread_id, WM_QUIT, 0, 0);
  if (WaitForSingleObject(monitor_thread, MONITOR_STOP_TIMEOUT_MS) != WAIT_OBJECT_0)
    return FALSE;
  CloseHandle(monitor_thread);
  monitor_thread = NULL;
  monitor_thread_id = 0;
  release_callbacks();
  return TRUE;
}

static void end_monitor_on_exit(void *data) {
  (void)data;
  if (!end_monitor())
    release_callbacks();
}

static napi_value start_monitor(napi_env env, napi_callback_info info) {
  napi_value arguments[3];
  napi_value name;
  uint32_t interval = 0;
  HANDLE started;
  BOOL hooked;
  if (read_arguments(env, info, 3, arguments) == NULL)
    return NULL;
  CHECK(env, napi_get_value_uint32(env, arguments[2], &interval));
  if (monitor_thread != NULL) {
    napi_throw_error(env, ERROR_CODE, "The input monitor is already running.");
    return NULL;
  }
  if (interval < USER_TIMER_MINIMUM) {
    napi_throw_range_error(env, ERROR_CODE, "The heartbeat interval is too short.");
    return NULL;
  }
  CHECK(env, napi_create_string_utf8(env, "computer-use input monitor", NAPI_AUTO_LENGTH, &name));
  CHECK(env, napi_create_threadsafe_function(env, arguments[0], NULL, name, 0, 1, NULL, NULL, NULL, call_physical, &physical_callback));
  if (napi_create_threadsafe_function(env, arguments[1], NULL, name, 0, 1, NULL, NULL, NULL, call_heartbeat, &heartbeat_callback) != napi_ok) {
    release_callbacks();
    throw_pending(env);
    return NULL;
  }
  heartbeat_interval = interval;
  heartbeat_sequence = 0;
  InterlockedExchange(&key_process, KEY_PROCESS_NONE);
  started = CreateEventW(NULL, TRUE, FALSE, NULL);
  monitor_thread = started != NULL ? CreateThread(NULL, 0, run_monitor, started, 0, &monitor_thread_id) : NULL;
  hooked = monitor_thread != NULL && WaitForSingleObject(started, MONITOR_START_TIMEOUT_MS) == WAIT_OBJECT_0 && monitor_hooked;
  if (started != NULL)
    CloseHandle(started);
  if (!hooked) {
    end_monitor();
    release_callbacks();
    return throw_windows(env, "Windows couldn't install the input monitor's hooks.");
  }
  return NULL;
}

static napi_value stop_monitor(napi_env env, napi_callback_info info) {
  (void)info;
  if (!end_monitor()) {
    napi_throw_error(env, ERROR_CODE, "The input monitor's thread didn't end in time.");
    return NULL;
  }
  return NULL;
}

static LRESULT CALLBACK on_border_message(HWND window, UINT message, WPARAM parameter, LPARAM data) {
  RECT client;
  if (message == WM_NCHITTEST)
    return HTTRANSPARENT;
  if (message == WM_MOUSEACTIVATE)
    return MA_NOACTIVATE;
  if (message == WM_ERASEBKGND) {
    GetClientRect(window, &client);
    FillRect((HDC)parameter, &client, border_brush);
    return 1;
  }
  return DefWindowProcW(window, message, parameter, data);
}

static void clear_border(void) {
  size_t index;
  for (index = 0; index < border_window_count; index++)
    DestroyWindow(border_windows[index]);
  border_window_count = 0;
  shown_border.count = 0;
  if (border_brush != NULL)
    DeleteObject(border_brush);
  border_brush = NULL;
}

static BOOL add_border_side(LONG x, LONG y, LONG width, LONG height) {
  HWND window;
  if (width <= 0 || height <= 0)
    return TRUE;
  window = CreateWindowExW(WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | WS_EX_TOPMOST, BORDER_CLASS, L"", WS_POPUP,
    x, y, width, height, NULL, NULL, GetModuleHandleW(NULL), NULL);
  if (window == NULL)
    return FALSE;
  border_windows[border_window_count] = window;
  border_window_count += 1;
  return SetLayeredWindowAttributes(window, 0, 255, LWA_ALPHA) && SetWindowPos(window, HWND_TOPMOST, x, y, width, height,
    SWP_NOACTIVATE | SWP_SHOWWINDOW);
}

static BOOL raise_border(const border_request *request) {
  size_t index;
  if (border_window_count == 0 || request->count != shown_border.count || request->color != shown_border.color
      || memcmp(request->frames, shown_border.frames, request->count * sizeof request->frames[0]) != 0)
    return FALSE;
  for (index = 0; index < border_window_count; index++)
    SetWindowPos(border_windows[index], HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER);
  return TRUE;
}

static BOOL show_border_frames(const border_request *request) {
  size_t index;
  if (raise_border(request))
    return TRUE;
  clear_border();
  border_brush = CreateSolidBrush(request->color);
  if (border_brush == NULL)
    return FALSE;
  for (index = 0; index < request->count; index++) {
    const border_frame *frame = &request->frames[index];
    LONG inner = frame->height - 2 * frame->thickness;
    if (!add_border_side(frame->x, frame->y, frame->width, frame->thickness)
        || !add_border_side(frame->x, frame->y + frame->height - frame->thickness, frame->width, frame->thickness)
        || !add_border_side(frame->x, frame->y + frame->thickness, frame->thickness, inner)
        || !add_border_side(frame->x + frame->width - frame->thickness, frame->y + frame->thickness, frame->thickness, inner)) {
      clear_border();
      return FALSE;
    }
  }
  shown_border.count = request->count;
  shown_border.color = request->color;
  memcpy(shown_border.frames, request->frames, request->count * sizeof request->frames[0]);
  return TRUE;
}

static border_request *open_border_request(void) {
  border_request *request = (border_request *)calloc(1, sizeof(border_request));
  if (request == NULL)
    return NULL;
  request->done = CreateEventW(NULL, TRUE, FALSE, NULL);
  if (request->done == NULL) {
    free(request);
    return NULL;
  }
  request->references = 1;
  return request;
}

static void release_border_request(border_request *request) {
  if (InterlockedDecrement(&request->references) != 0)
    return;
  CloseHandle(request->done);
  free(request);
}

static DWORD WINAPI run_border(LPVOID started) {
  MSG message;
  WNDCLASSEXW border_class;
  SetThreadDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
  PeekMessageW(&message, NULL, WM_USER, WM_USER, PM_NOREMOVE);
  ZeroMemory(&border_class, sizeof border_class);
  border_class.cbSize = sizeof border_class;
  border_class.lpfnWndProc = on_border_message;
  border_class.hInstance = GetModuleHandleW(NULL);
  border_class.lpszClassName = BORDER_CLASS;
  if (RegisterClassExW(&border_class) == 0 && GetLastError() != ERROR_CLASS_ALREADY_EXISTS) {
    border_start_error = GetLastError();
    return 1;
  }
  SetEvent((HANDLE)started);
  while (GetMessageW(&message, NULL, 0, 0) > 0) {
    if (message.hwnd == NULL && message.message == WM_BORDER_SHOW) {
      border_request *request = (border_request *)message.lParam;
      request->is_shown = show_border_frames(request);
      SetEvent(request->done);
      release_border_request(request);
    } else if (message.hwnd == NULL && message.message == WM_BORDER_HIDE) {
      border_request *request = (border_request *)message.lParam;
      clear_border();
      SetEvent(request->done);
      release_border_request(request);
    } else {
      DispatchMessageW(&message);
    }
  }
  clear_border();
  return 0;
}

static BOOL is_border_running(void) {
  return border_thread != NULL && WaitForSingleObject(border_thread, 0) == WAIT_TIMEOUT;
}

static BOOL start_border(DWORD *error) {
  HANDLE started;
  HANDLE waits[2];
  DWORD waited;
  *error = ERROR_SUCCESS;
  if (is_border_running())
    return TRUE;
  if (border_thread != NULL) {
    CloseHandle(border_thread);
    border_thread = NULL;
    border_thread_id = 0;
  }
  if (border_late_start != NULL) {
    CloseHandle(border_late_start);
    border_late_start = NULL;
  }
  started = CreateEventW(NULL, TRUE, FALSE, NULL);
  if (started == NULL) {
    *error = GetLastError();
    return FALSE;
  }
  border_start_error = ERROR_SUCCESS;
  border_thread = CreateThread(NULL, 0, run_border, started, 0, &border_thread_id);
  if (border_thread == NULL) {
    *error = GetLastError();
    border_thread_id = 0;
    CloseHandle(started);
    return FALSE;
  }
  waits[0] = started;
  waits[1] = border_thread;
  waited = WaitForMultipleObjects(2, waits, FALSE, BORDER_TIMEOUT_MS);
  if (waited == WAIT_OBJECT_0 + 1) {
    *error = border_start_error != ERROR_SUCCESS ? border_start_error : ERROR_INVALID_FUNCTION;
    CloseHandle(border_thread);
    border_thread = NULL;
    border_thread_id = 0;
  } else if (waited != WAIT_OBJECT_0) {
    *error = waited == WAIT_TIMEOUT ? ERROR_TIMEOUT : GetLastError();
    border_late_start = started;
    return FALSE;
  }
  CloseHandle(started);
  return waited == WAIT_OBJECT_0;
}

static void end_border_on_exit(void *data) {
  (void)data;
  if (border_thread == NULL)
    return;
  PostThreadMessageW(border_thread_id, WM_QUIT, 0, 0);
  if (WaitForSingleObject(border_thread, BORDER_TIMEOUT_MS) != WAIT_OBJECT_0)
    return;
  CloseHandle(border_thread);
  border_thread = NULL;
  border_thread_id = 0;
}

static napi_value read_border_frame(napi_env env, napi_value value, border_frame *frame) {
  const char *names[] = { "x", "y", "width", "height", "thickness" };
  LONG *fields[] = { &frame->x, &frame->y, &frame->width, &frame->height, &frame->thickness };
  size_t index;
  for (index = 0; index < sizeof names / sizeof names[0]; index++) {
    napi_value item;
    int32_t number = 0;
    CHECK(env, napi_get_named_property(env, value, names[index], &item));
    CHECK(env, napi_get_value_int32(env, item, &number));
    *fields[index] = number;
  }
  if (frame->width <= 0 || frame->height <= 0 || frame->thickness <= 0 || frame->thickness > frame->width / 2 || frame->thickness > frame->height / 2) {
    napi_throw_range_error(env, ERROR_CODE, "A border frame has no size, no thickness, or a thickness that doesn't fit twice into it.");
    return NULL;
  }
  return value;
}

static BOOL post_border_request(UINT message, border_request *request) {
  request->references = 2;
  if (PostThreadMessageW(border_thread_id, message, 0, (LPARAM)request))
    return TRUE;
  request->references = 1;
  return FALSE;
}

static BOOL await_border(border_request *request) {
  return WaitForSingleObject(request->done, BORDER_TIMEOUT_MS) == WAIT_OBJECT_0;
}

static napi_value show_border(napi_env env, napi_callback_info info) {
  napi_value arguments[2];
  uint32_t count = 0;
  uint32_t rgb = 0;
  uint32_t index;
  border_request *request;
  DWORD error = ERROR_SUCCESS;
  BOOL is_answered;
  BOOL is_shown;
  if (read_arguments(env, info, 2, arguments) == NULL)
    return NULL;
  CHECK(env, napi_get_array_length(env, arguments[0], &count));
  CHECK(env, napi_get_value_uint32(env, arguments[1], &rgb));
  if (count > MAX_BORDER_FRAMES || rgb > 0xFFFFFF) {
    napi_throw_range_error(env, ERROR_CODE, "The border has too many frames, or its colour isn't 0xRRGGBB.");
    return NULL;
  }
  request = open_border_request();
  if (request == NULL)
    return throw_windows(env, "The border's request couldn't be prepared.");
  for (index = 0; index < count; index++) {
    napi_value item;
    if (napi_get_element(env, arguments[0], index, &item) != napi_ok || read_border_frame(env, item, &request->frames[index]) == NULL) {
      throw_pending(env);
      release_border_request(request);
      return NULL;
    }
  }
  request->count = count;
  request->color = RGB((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF);
  if (!start_border(&error)) {
    release_border_request(request);
    return throw_windows_error(env, "Windows couldn't start the border's thread.", error);
  }
  if (!post_border_request(WM_BORDER_SHOW, request)) {
    error = GetLastError();
    release_border_request(request);
    return throw_windows_error(env, "Windows couldn't reach the border's thread.", error);
  }
  is_answered = await_border(request);
  is_shown = is_answered && request->is_shown;
  release_border_request(request);
  if (!is_answered) {
    napi_throw_error(env, ERROR_CODE, "The border's thread didn't answer in time.");
    return NULL;
  }
  if (!is_shown) {
    napi_throw_error(env, ERROR_CODE, "Windows couldn't show the border.");
    return NULL;
  }
  return NULL;
}

static napi_value hide_border(napi_env env, napi_callback_info info) {
  border_request *request;
  DWORD error;
  BOOL is_answered;
  (void)info;
  if (!is_border_running())
    return NULL;
  request = open_border_request();
  if (request == NULL)
    return throw_windows(env, "The border's request couldn't be prepared.");
  if (!post_border_request(WM_BORDER_HIDE, request)) {
    error = GetLastError();
    release_border_request(request);
    return throw_windows_error(env, "Windows couldn't reach the border's thread.", error);
  }
  is_answered = await_border(request);
  release_border_request(request);
  if (!is_answered) {
    napi_throw_error(env, ERROR_CODE, "The border's thread didn't answer in time.");
    return NULL;
  }
  return NULL;
}

static napi_status set_null(napi_env env, napi_value object, const char *name) {
  napi_value item;
  napi_status status = napi_get_null(env, &item);
  return status != napi_ok ? status : napi_set_named_property(env, object, name, item);
}

static void push_path(path_list *list, const WCHAR *path, size_t length) {
  napi_value item;
  if (list->status != napi_ok || list->is_full)
    return;
  if (list->count >= MAX_APP_PATHS) {
    list->is_full = TRUE;
    return;
  }
  list->status = napi_create_string_utf16(list->env, (const char16_t *)path, length, &item);
  if (list->status == napi_ok)
    list->status = napi_set_element(list->env, list->array, list->count, item);
  if (list->status == napi_ok)
    list->count += 1;
}

static BOOL is_app_window(HWND window) {
  DWORD cloaked = 0;
  if (!IsWindowVisible(window) || GetWindow(window, GW_OWNER) != NULL)
    return FALSE;
  if ((GetWindowLongPtrW(window, GWL_EXSTYLE) & WS_EX_TOOLWINDOW) != 0)
    return FALSE;
  return FAILED(DwmGetWindowAttribute(window, DWMWA_CLOAKED, &cloaked, sizeof cloaked)) || cloaked == 0;
}

static BOOL CALLBACK add_running(HWND window, LPARAM data) {
  path_list *list = (path_list *)data;
  window_facts facts;
  if (is_app_window(window) && read_window(window, &facts))
    push_path(list, facts.image, facts.image_length);
  return list->status == napi_ok && !list->is_full;
}

static void unquote(WCHAR *path) {
  WCHAR *end;
  if (path[0] != L'"')
    return;
  end = wcschr(path + 1, L'"');
  if (end != NULL)
    *end = L'\0';
  memmove(path, path + 1, (wcslen(path + 1) + 1) * sizeof(WCHAR));
}

static void add_installed(path_list *list, HKEY root) {
  HKEY paths = NULL;
  WCHAR name[MAX_KEY_NAME];
  WCHAR path[MAX_IMAGE_PATH];
  DWORD index;
  LSTATUS status = ERROR_SUCCESS;
  if (RegOpenKeyExW(root, APP_PATHS_KEY, 0, KEY_READ, &paths) != ERROR_SUCCESS)
    return;
  for (index = 0; list->status == napi_ok && !list->is_full && status != ERROR_NO_MORE_ITEMS; index++) {
    DWORD name_length = MAX_KEY_NAME;
    DWORD size = sizeof path;
    DWORD attributes;
    status = RegEnumKeyExW(paths, index, name, &name_length, NULL, NULL, NULL, NULL);
    if (status != ERROR_SUCCESS || RegGetValueW(paths, name, NULL, RRF_RT_REG_SZ, NULL, path, &size) != ERROR_SUCCESS)
      continue;
    unquote(path);
    attributes = GetFileAttributesW(path);
    if (attributes != INVALID_FILE_ATTRIBUTES && (attributes & FILE_ATTRIBUTE_DIRECTORY) == 0)
      push_path(list, path, NAPI_AUTO_LENGTH);
  }
  RegCloseKey(paths);
}

static napi_value list_app_paths(napi_env env, napi_callback_info info) {
  WCHAR host[MAX_IMAGE_PATH];
  DWORD host_length;
  path_list running = { env, NULL, 0, FALSE, napi_ok };
  path_list installed = { env, NULL, 0, FALSE, napi_ok };
  napi_value result;
  (void)info;
  host_length = GetModuleFileNameW(NULL, host, MAX_IMAGE_PATH);
  if (host_length == 0 || host_length >= MAX_IMAGE_PATH)
    return throw_windows(env, "Windows couldn't read the host program's path.");
  CHECK(env, napi_create_array(env, &running.array));
  CHECK(env, napi_create_array(env, &installed.array));
  EnumWindows(add_running, (LPARAM)&running);
  CHECK(env, running.status);
  add_installed(&installed, HKEY_LOCAL_MACHINE);
  add_installed(&installed, HKEY_CURRENT_USER);
  CHECK(env, installed.status);
  if (running.is_full || installed.is_full) {
    napi_throw_range_error(env, ERROR_CODE, "The running or the installed apps have more than 1,024 program paths, so the list would be incomplete.");
    return NULL;
  }
  CHECK(env, napi_create_object(env, &result));
  CHECK(env, set_text(env, result, "host", host, host_length));
  CHECK(env, napi_set_named_property(env, result, "running", running.array));
  CHECK(env, napi_set_named_property(env, result, "installed", installed.array));
  return result;
}

static BOOL read_description(const WCHAR *path, WCHAR *text, size_t capacity) {
  DWORD handle = 0;
  DWORD size = GetFileVersionInfoSizeW(path, &handle);
  void *data = size != 0 ? malloc(size) : NULL;
  version_translation *translations = NULL;
  UINT translations_size = 0;
  WCHAR query[VERSION_QUERY_LENGTH];
  WCHAR *value = NULL;
  UINT value_length = 0;
  BOOL read = FALSE;
  if (data == NULL)
    return FALSE;
  if (GetFileVersionInfoW(path, 0, size, data)
      && VerQueryValueW(data, L"\\VarFileInfo\\Translation", (LPVOID *)&translations, &translations_size)
      && translations_size >= sizeof *translations) {
    _snwprintf_s(query, VERSION_QUERY_LENGTH, _TRUNCATE, L"\\StringFileInfo\\%04x%04x\\FileDescription", translations[0].language, translations[0].code_page);
    read = VerQueryValueW(data, query, (LPVOID *)&value, &value_length) && value_length > 1 && wcsncpy_s(text, capacity, value, _TRUNCATE) != EINVAL;
  }
  free(data);
  return read;
}

static BOOL read_signer(const WCHAR *path, WCHAR *text, DWORD capacity) {
  WINTRUST_FILE_INFO file;
  WINTRUST_DATA trust;
  GUID action = WINTRUST_ACTION_GENERIC_VERIFY_V2;
  CRYPT_PROVIDER_DATA *provider;
  CRYPT_PROVIDER_SGNR *signer;
  CRYPT_PROVIDER_CERT *certificate;
  BOOL read = FALSE;
  ZeroMemory(&file, sizeof file);
  file.cbStruct = sizeof file;
  file.pcwszFilePath = path;
  ZeroMemory(&trust, sizeof trust);
  trust.cbStruct = sizeof trust;
  trust.dwUIChoice = WTD_UI_NONE;
  trust.fdwRevocationChecks = WTD_REVOKE_NONE;
  trust.dwUnionChoice = WTD_CHOICE_FILE;
  trust.pFile = &file;
  trust.dwStateAction = WTD_STATEACTION_VERIFY;
  trust.dwProvFlags = WTD_CACHE_ONLY_URL_RETRIEVAL;
  if (WinVerifyTrust((HWND)INVALID_HANDLE_VALUE, &action, &trust) == ERROR_SUCCESS) {
    provider = WTHelperProvDataFromStateData(trust.hWVTStateData);
    signer = provider != NULL ? WTHelperGetProvSignerFromChain(provider, 0, FALSE, 0) : NULL;
    certificate = signer != NULL ? WTHelperGetProvCertFromChain(signer, 0) : NULL;
    read = certificate != NULL && CertGetNameStringW(certificate->pCert, CERT_NAME_SIMPLE_DISPLAY_TYPE, 0, NULL, text, capacity) > 1;
  }
  trust.dwStateAction = WTD_STATEACTION_CLOSE;
  WinVerifyTrust((HWND)INVALID_HANDLE_VALUE, &action, &trust);
  return read;
}

static napi_value describe_program(napi_env env, napi_callback_info info) {
  napi_value argument;
  napi_value result;
  WCHAR path[MAX_IMAGE_PATH];
  WCHAR text[MAX_PROGRAM_TEXT];
  size_t length = 0;
  if (read_arguments(env, info, 1, &argument) == NULL)
    return NULL;
  CHECK(env, napi_get_value_string_utf16(env, argument, (char16_t *)path, MAX_IMAGE_PATH, &length));
  if (length == 0 || length >= MAX_IMAGE_PATH - 1) {
    napi_throw_range_error(env, ERROR_CODE, "The program path is empty or too long.");
    return NULL;
  }
  CHECK(env, napi_create_object(env, &result));
  CHECK(env, read_description(path, text, MAX_PROGRAM_TEXT) ? set_text(env, result, "description", text, NAPI_AUTO_LENGTH) : set_null(env, result, "description"));
  CHECK(env, read_signer(path, text, MAX_PROGRAM_TEXT) ? set_text(env, result, "signer", text, NAPI_AUTO_LENGTH) : set_null(env, result, "signer"));
  return result;
}

static BOOL read_bitmap(HBITMAP bitmap, LONG width, LONG height, BYTE *pixels) {
  BITMAPINFO format;
  HDC context = CreateCompatibleDC(NULL);
  int lines;
  if (context == NULL)
    return FALSE;
  ZeroMemory(&format, sizeof format);
  format.bmiHeader.biSize = sizeof format.bmiHeader;
  format.bmiHeader.biWidth = width;
  format.bmiHeader.biHeight = -height;
  format.bmiHeader.biPlanes = 1;
  format.bmiHeader.biBitCount = 32;
  format.bmiHeader.biCompression = BI_RGB;
  lines = GetDIBits(context, bitmap, 0, (UINT)height, pixels, &format, DIB_RGB_COLORS);
  DeleteDC(context);
  return lines == height;
}

static BOOL read_icon_pixels(HICON icon, LONG *width, LONG *height, BYTE **pixels) {
  ICONINFO parts;
  BITMAP color;
  BYTE *mask = NULL;
  BOOL read = FALSE;
  BOOL has_alpha = FALSE;
  LONG index;
  *pixels = NULL;
  if (!GetIconInfo(icon, &parts))
    return FALSE;
  if (parts.hbmColor != NULL && GetObjectW(parts.hbmColor, (int)sizeof color, &color) == (int)sizeof color && color.bmWidth > 0 && color.bmHeight > 0
      && color.bmWidth <= MAX_ICON_SIDE && color.bmHeight <= MAX_ICON_SIDE) {
    *width = color.bmWidth;
    *height = color.bmHeight;
    *pixels = malloc((size_t)color.bmWidth * color.bmHeight * 4);
    read = *pixels != NULL && read_bitmap(parts.hbmColor, color.bmWidth, color.bmHeight, *pixels);
    for (index = 0; read && !has_alpha && index < color.bmWidth * color.bmHeight; index++)
      has_alpha = (*pixels)[index * 4 + 3] != 0;
    if (read && !has_alpha) {
      mask = malloc((size_t)color.bmWidth * color.bmHeight * 4);
      read = mask != NULL && read_bitmap(parts.hbmMask, color.bmWidth, color.bmHeight, mask);
      for (index = 0; read && index < color.bmWidth * color.bmHeight; index++)
        (*pixels)[index * 4 + 3] = (BYTE)(mask[index * 4] == 0 ? 255 : 0);
      free(mask);
    }
  }
  if (parts.hbmColor != NULL)
    DeleteObject(parts.hbmColor);
  if (parts.hbmMask != NULL)
    DeleteObject(parts.hbmMask);
  if (!read) {
    free(*pixels);
    *pixels = NULL;
  }
  return read;
}

static napi_value read_program_icon(napi_env env, napi_callback_info info) {
  napi_value arguments[2];
  napi_value result;
  napi_value buffer;
  WCHAR path[MAX_IMAGE_PATH];
  size_t length = 0;
  uint32_t size = 0;
  HICON icon = NULL;
  LONG width = 0;
  LONG height = 0;
  BYTE *pixels = NULL;
  void *copy = NULL;
  BOOL read;
  napi_status status;
  if (read_arguments(env, info, 2, arguments) == NULL)
    return NULL;
  CHECK(env, napi_get_value_string_utf16(env, arguments[0], (char16_t *)path, MAX_IMAGE_PATH, &length));
  if (length == 0 || length >= MAX_IMAGE_PATH - 1) {
    napi_throw_range_error(env, ERROR_CODE, "The program path is empty or too long.");
    return NULL;
  }
  CHECK(env, napi_get_value_uint32(env, arguments[1], &size));
  if (size == 0 || size > MAX_ICON_SIDE) {
    napi_throw_range_error(env, ERROR_CODE, "The icon's size is out of range.");
    return NULL;
  }
  read = SHDefExtractIconW(path, 0, 0, &icon, NULL, MAKELONG(size, size)) == S_OK && icon != NULL;
  read = read && read_icon_pixels(icon, &width, &height, &pixels);
  if (icon != NULL)
    DestroyIcon(icon);
  if (!read) {
    CHECK(env, napi_get_null(env, &result));
    return result;
  }
  status = napi_create_arraybuffer(env, (size_t)width * height * 4, &copy, &buffer);
  if (status == napi_ok)
    memcpy(copy, pixels, (size_t)width * height * 4);
  free(pixels);
  CHECK(env, status);
  CHECK(env, napi_create_object(env, &result));
  CHECK(env, set_number(env, result, "width", width));
  CHECK(env, set_number(env, result, "height", height));
  CHECK(env, napi_set_named_property(env, result, "bgra", buffer));
  return result;
}

typedef enum {
  CONTROL_READ,
  CONTROL_FIND,
  CONTROL_HIT,
  CONTROL_FOCUS
} control_kind;

typedef struct {
  int parent;
  DWORD process_id;
  int image;
  int control_type;
  uint32_t read;
  uint32_t index;
  WCHAR name[MAX_CONTROL_TEXT];
  size_t name_length;
  WCHAR value[MAX_CONTROL_TEXT];
  size_t value_length;
  BOOL has_value;
  BOOL is_enabled;
  BOOL has_focus;
  BOOL is_password;
  BOOL is_read_only;
  BOOL is_selected;
  int toggle_state;
  int expand_state;
  RECT bounds;
} control_row;

typedef struct {
  volatile LONG references;
  napi_async_work work;
  napi_deferred deferred;
  control_kind kind;
  target_window target;
  BOOL has_handle;
  uint32_t handle_read;
  uint32_t handle_index;
  POINT at;
  ULONGLONG deadline;
  BOOL is_finished;
  BOOL is_abandoned;
  char error[MAX_ERROR_TEXT];
  control_row *rows;
  uint32_t count;
  uint32_t left_out;
  uint32_t published_left_out;
  BOOL is_timed_out;
  char failure[MAX_ERROR_TEXT];
  uint32_t answered;
  uint32_t answered_left_out;
  BOOL is_answer_timed_out;
  DWORD image_ids[MAX_CONTROL_IMAGES];
  WCHAR images[MAX_CONTROL_IMAGES][MAX_IMAGE_PATH];
  int image_count;
  BOOL is_found;
  control_row spot;
  BOOL is_spot_offscreen;
  BOOL is_hit;
  BOOL is_focus_read;
  BOOL is_focused_password;
  DWORD focus_process_id;
  HWND focus_window;
  IUIAutomationCondition *own_children;
  IUIAutomationCondition *other_children;
  ULONGLONG probe_started;
  char probe[2048];
} control_request;

static ULONGLONG probe_automation_ms;

static void probe_step(control_request *request, const char *label, long result) {
  size_t length = strlen(request->probe);
  if (length < sizeof request->probe - 64)
    sprintf_s(request->probe + length, sizeof request->probe - length, "%s@%llu(%lx) ", label, GetTickCount64() - request->probe_started, (unsigned long)result);
}

static void probe_write(control_request *request, const char *outcome) {
  FILE *file = NULL;
  if (fopen_s(&file, "C:\\Users\\Public\\noldova-read-steps.log", "a") != 0 || file == NULL)
    return;
  fprintf(file, "PROBE kind %d %s at %llu ms, automation start %llu ms, listed %u, timedOut %d: %s\n", (int)request->kind, outcome,
    GetTickCount64() - request->probe_started, probe_automation_ms, request->count, request->is_timed_out, request->probe);
  fclose(file);
}

typedef struct {
  IUIAutomationElement *element;
  int row;
  int depth;
  RECT area;
} control_visit;

typedef struct {
  uint32_t read;
  uint32_t count;
  IUIAutomationElement *elements[MAX_READ_CONTROLS];
  BOOL is_app[MAX_READ_CONTROLS];
} control_references;

static const CLSID AUTOMATION_CLASS = { 0xe22ad333, 0xb25f, 0x460c, { 0x83, 0xd0, 0x05, 0x81, 0x10, 0x73, 0x95, 0xc9 } };
static const IID AUTOMATION_INTERFACE = { 0x34723aff, 0x0c9d, 0x49d0, { 0x98, 0x96, 0x7a, 0xb5, 0x2d, 0xf8, 0xcd, 0x8a } };
static const IID TEXT_PATTERN_INTERFACE = { 0x32eba289, 0x3583, 0x42c9, { 0x9c, 0x59, 0x3b, 0x6d, 0x9a, 0x1e, 0x9b, 0x6a } };
static const PROPERTYID READ_PROPERTIES[] = {
  PROPERTY_CONTROL_TYPE, PROPERTY_NAME, PROPERTY_BOUNDS, PROPERTY_IS_OFFSCREEN, PROPERTY_IS_ENABLED, PROPERTY_HAS_FOCUS, PROPERTY_IS_PASSWORD,
  PROPERTY_PROCESS_ID, PROPERTY_TOGGLE_STATE, PROPERTY_EXPAND_STATE, PROPERTY_IS_SELECTED, PROPERTY_IS_READ_ONLY, PROPERTY_HAS_TEXT_PATTERN,
  PROPERTY_HAS_VALUE_PATTERN
};
static const PROPERTYID FIND_PROPERTIES[] = { PROPERTY_CONTROL_TYPE, PROPERTY_NAME, PROPERTY_BOUNDS, PROPERTY_IS_OFFSCREEN, PROPERTY_IS_ENABLED, PROPERTY_PROCESS_ID };
static const PROPERTYID APP_PROPERTIES[] = { PROPERTY_PROCESS_ID, PROPERTY_BOUNDS, PROPERTY_IS_OFFSCREEN };

static SRWLOCK control_lock = SRWLOCK_INIT;
static CONDITION_VARIABLE control_changed = CONDITION_VARIABLE_INIT;
static control_request *control_pending = NULL;
static BOOL control_busy = FALSE;
static BOOL control_started = FALSE;
static IUIAutomation2 *automation = NULL;
static IUIAutomationCondition *control_view = NULL;
static IUIAutomationTreeWalker *raw_walker = NULL;
static IUIAutomationCacheRequest *read_cache = NULL;
static IUIAutomationCacheRequest *find_cache = NULL;
static IUIAutomationCacheRequest *app_cache = NULL;
static char control_failure[MAX_ERROR_TEXT];
static uint32_t control_reads = 0;
static control_references whole_references;
static control_references under_references;
static control_visit control_visits[MAX_READ_CONTROLS + MAX_CONTROL_ROOTS];

static void let_go_request(control_request *request) {
  if (InterlockedDecrement(&request->references) == 0) {
    free(request->rows);
    free(request);
  }
}

static BOOL is_past(ULONGLONG deadline) {
  return GetTickCount64() >= deadline;
}

static void free_references(control_references *references) {
  uint32_t index;
  for (index = 0; index < references->count; index++)
    IUIAutomationElement_Release(references->elements[index]);
  references->count = 0;
}

static IUIAutomationElement *find_reference(uint32_t read, uint32_t index) {
  if (read == whole_references.read && index < whole_references.count)
    return whole_references.elements[index];
  if (read == under_references.read && index < under_references.count)
    return under_references.elements[index];
  return NULL;
}

static BOOL is_app_reference(uint32_t read, uint32_t index) {
  if (read == whole_references.read && index < whole_references.count)
    return whole_references.is_app[index];
  return read == under_references.read && index < under_references.count && under_references.is_app[index];
}

static BOOL make_cache(const PROPERTYID *properties, size_t count, IUIAutomationCacheRequest **cache) {
  size_t index;
  if (FAILED(IUIAutomation2_CreateCacheRequest(automation, cache)))
    return FALSE;
  for (index = 0; index < count; index++)
    if (FAILED(IUIAutomationCacheRequest_AddProperty(*cache, properties[index])))
      return FALSE;
  return TRUE;
}

static BOOL start_automation(void) {
  if (FAILED(CoInitializeEx(NULL, COINIT_MULTITHREADED)))
    strcpy_s(control_failure, MAX_ERROR_TEXT, "The control thread couldn't start COM.");
  else if (FAILED(CoCreateInstance(&AUTOMATION_CLASS, NULL, CLSCTX_INPROC_SERVER, &AUTOMATION_INTERFACE, (void **)&automation)))
    strcpy_s(control_failure, MAX_ERROR_TEXT, "UI Automation's client couldn't be created.");
  else if (FAILED(IUIAutomation2_put_ConnectionTimeout(automation, UIA_TIMEOUT_MS)) || FAILED(IUIAutomation2_put_TransactionTimeout(automation, UIA_TIMEOUT_MS))
      || FAILED(IUIAutomation2_get_ControlViewCondition(automation, &control_view)) || FAILED(IUIAutomation2_get_RawViewWalker(automation, &raw_walker))
      || !make_cache(READ_PROPERTIES, sizeof READ_PROPERTIES / sizeof READ_PROPERTIES[0], &read_cache)
      || !make_cache(FIND_PROPERTIES, sizeof FIND_PROPERTIES / sizeof FIND_PROPERTIES[0], &find_cache)
      || !make_cache(APP_PROPERTIES, sizeof APP_PROPERTIES / sizeof APP_PROPERTIES[0], &app_cache))
    strcpy_s(control_failure, MAX_ERROR_TEXT, "UI Automation's client couldn't be set up.");
  return control_failure[0] == '\0';
}

static int read_int_property(IUIAutomationElement *element, PROPERTYID property, int otherwise) {
  VARIANT value;
  int result = otherwise;
  VariantInit(&value);
  if (SUCCEEDED(IUIAutomationElement_GetCachedPropertyValueEx(element, property, TRUE, &value)) && value.vt == VT_I4)
    result = value.lVal;
  VariantClear(&value);
  return result;
}

static BOOL read_bool_property(IUIAutomationElement *element, PROPERTYID property) {
  VARIANT value;
  BOOL result = FALSE;
  VariantInit(&value);
  if (SUCCEEDED(IUIAutomationElement_GetCachedPropertyValueEx(element, property, TRUE, &value)) && value.vt == VT_BOOL)
    result = value.boolVal != VARIANT_FALSE;
  VariantClear(&value);
  return result;
}

static size_t copy_control_text(WCHAR *target, const WCHAR *source, size_t length) {
  size_t kept = length < MAX_CONTROL_TEXT ? length : MAX_CONTROL_TEXT;
  if (kept < length && kept > 0 && IS_HIGH_SURROGATE(source[kept - 1]))
    kept--;
  if (kept > 0)
    memcpy(target, source, kept * sizeof(WCHAR));
  return kept;
}

static void read_cached_name(IUIAutomationElement *element, control_row *row) {
  BSTR name = NULL;
  row->name_length = SUCCEEDED(IUIAutomationElement_get_CachedName(element, &name)) && name != NULL ? copy_control_text(row->name, name, SysStringLen(name)) : 0;
  SysFreeString(name);
}

static void read_cached_row(IUIAutomationElement *element, control_row *row) {
  CONTROLTYPEID control_type = 0;
  int process_id = 0;
  BOOL flag = FALSE;
  IUIAutomationElement_get_CachedControlType(element, &control_type);
  row->control_type = control_type;
  read_cached_name(element, row);
  if (FAILED(IUIAutomationElement_get_CachedBoundingRectangle(element, &row->bounds)))
    SetRectEmpty(&row->bounds);
  row->is_enabled = SUCCEEDED(IUIAutomationElement_get_CachedIsEnabled(element, &flag)) && flag;
  flag = FALSE;
  row->has_focus = SUCCEEDED(IUIAutomationElement_get_CachedHasKeyboardFocus(element, &flag)) && flag;
  flag = FALSE;
  row->is_password = SUCCEEDED(IUIAutomationElement_get_CachedIsPassword(element, &flag)) && flag;
  IUIAutomationElement_get_CachedProcessId(element, &process_id);
  row->process_id = (DWORD)process_id;
  row->toggle_state = read_int_property(element, PROPERTY_TOGGLE_STATE, -1);
  row->expand_state = read_int_property(element, PROPERTY_EXPAND_STATE, -1);
  row->is_selected = read_bool_property(element, PROPERTY_IS_SELECTED);
  row->is_read_only = read_bool_property(element, PROPERTY_IS_READ_ONLY);
  row->has_value = FALSE;
  row->value_length = 0;
}

static void read_app_row(IUIAutomationElement *element, control_row *row) {
  int process_id = 0;
  IUIAutomationElement_get_CachedProcessId(element, &process_id);
  row->process_id = (DWORD)process_id;
  if (FAILED(IUIAutomationElement_get_CachedBoundingRectangle(element, &row->bounds)))
    SetRectEmpty(&row->bounds);
  row->is_enabled = TRUE;
  row->toggle_state = -1;
  row->expand_state = -1;
}

static BOOL is_offscreen(IUIAutomationElement *element) {
  BOOL flag = FALSE;
  return SUCCEEDED(IUIAutomationElement_get_CachedIsOffscreen(element, &flag)) && flag;
}

static void read_value(IUIAutomationElement *element, control_row *row) {
  IUIAutomationTextPattern *text = NULL;
  IUIAutomationTextRange *range = NULL;
  BSTR value = NULL;
  VARIANT whole;
  if (read_bool_property(element, PROPERTY_HAS_TEXT_PATTERN)) {
    if (SUCCEEDED(IUIAutomationElement_GetCurrentPatternAs(element, PATTERN_TEXT, &TEXT_PATTERN_INTERFACE, (void **)&text)) && text != NULL
        && SUCCEEDED(IUIAutomationTextPattern_get_DocumentRange(text, &range)) && range != NULL
        && SUCCEEDED(IUIAutomationTextRange_GetText(range, MAX_CONTROL_TEXT, &value)) && value != NULL) {
      row->value_length = copy_control_text(row->value, value, SysStringLen(value));
      row->has_value = TRUE;
    }
    SysFreeString(value);
    if (range != NULL)
      IUIAutomationTextRange_Release(range);
    if (text != NULL)
      IUIAutomationTextPattern_Release(text);
    return;
  }
  if (!read_bool_property(element, PROPERTY_HAS_VALUE_PATTERN))
    return;
  VariantInit(&whole);
  if (SUCCEEDED(IUIAutomationElement_GetCurrentPropertyValue(element, PROPERTY_VALUE, &whole)) && whole.vt == VT_BSTR && whole.bstrVal != NULL) {
    row->value_length = copy_control_text(row->value, whole.bstrVal, SysStringLen(whole.bstrVal));
    row->has_value = TRUE;
  }
  VariantClear(&whole);
}

static int find_image(control_request *request, DWORD process_id) {
  int index;
  for (index = 0; index < request->image_count; index++)
    if (request->image_ids[index] == process_id)
      return request->images[index][0] != L'\0' ? index : -1;
  if (request->image_count == MAX_CONTROL_IMAGES)
    return -1;
  index = request->image_count++;
  request->image_ids[index] = process_id;
  if (read_image(process_id, request->images[index]) == 0)
    request->images[index][0] = L'\0';
  return request->images[index][0] != L'\0' ? index : -1;
}

static int add_row(control_request *request, control_references *references, IUIAutomationElement *element, const control_row *row,
    BOOL is_app) {
  int index = -1;
  AcquireSRWLockExclusive(&control_lock);
  if (!request->is_abandoned) {
    index = (int)request->count;
    request->rows[index] = *row;
    request->rows[index].read = references->read;
    request->rows[index].index = references->count;
    request->count++;
    request->published_left_out = request->left_out;
  }
  ReleaseSRWLockExclusive(&control_lock);
  if (index >= 0) {
    IUIAutomationElement_AddRef(element);
    references->is_app[references->count] = is_app;
    references->elements[references->count++] = element;
  }
  return index;
}

static BOOL add_visit(int *visit_count, IUIAutomationElement *element, int row, int depth, const RECT *area) {
  if (*visit_count == MAX_READ_CONTROLS + MAX_CONTROL_ROOTS)
    return FALSE;
  IUIAutomationElement_AddRef(element);
  control_visits[*visit_count].element = element;
  control_visits[*visit_count].row = row;
  control_visits[*visit_count].depth = depth;
  control_visits[*visit_count].area = *area;
  (*visit_count)++;
  return TRUE;
}

static BOOL is_shown_control(control_request *request, IUIAutomationElement *element, control_row *row, const RECT *area) {
  RECT inside;
  if (is_offscreen(element) || IsRectEmpty(&row->bounds) || !IntersectRect(&inside, &row->bounds, area))
    return FALSE;
  row->image = find_image(request, row->process_id);
  return row->image >= 0;
}

static void add_children(control_request *request, control_references *references, const control_visit *visit, int *visit_count,
    IUIAutomationElementArray *children, BOOL is_own, int *taken, BOOL *is_going) {
  int length = 0;
  int index;
  if (children == NULL)
    return;
  IUIAutomationElementArray_get_Length(children, &length);
  for (index = 0; index < length; index++) {
    IUIAutomationElement *child = NULL;
    control_row row;
    int added;
    if (*taken == MAX_CONTROL_CHILDREN) {
      request->left_out += (uint32_t)(length - index);
      return;
    }
    (*taken)++;
    if (FAILED(IUIAutomationElementArray_GetElement(children, index, &child)) || child == NULL)
      continue;
    ZeroMemory(&row, sizeof row);
    if (is_own)
      read_cached_row(child, &row);
    else
      read_app_row(child, &row);
    row.parent = visit->row;
    if (!*is_going || !is_shown_control(request, child, &row, &visit->area) || request->count == MAX_READ_CONTROLS) {
      request->left_out++;
      IUIAutomationElement_Release(child);
      continue;
    }
    if (is_own && !row.is_password) {
      if (is_past(request->deadline)) {
        request->is_timed_out = TRUE;
        *is_going = FALSE;
        request->left_out++;
        IUIAutomationElement_Release(child);
        continue;
      }
      read_value(child, &row);
    }
    added = add_row(request, references, child, &row, !is_own);
    if (added < 0)
      *is_going = FALSE;
    else if (is_own && visit->depth + 1 < MAX_CONTROL_DEPTH)
      add_visit(visit_count, child, added, visit->depth + 1, &visit->area);
    IUIAutomationElement_Release(child);
  }
}

static BOOL read_children(control_request *request, control_references *references, const control_visit *visit, int *visit_count) {
  IUIAutomationElementArray *children = NULL;
  IUIAutomationElementArray *others = NULL;
  int taken = 0;
  BOOL is_going = TRUE;
  if (is_past(request->deadline)) {
    request->is_timed_out = TRUE;
    return FALSE;
  }
  {
    HRESULT probe_result = IUIAutomationElement_FindAllBuildCache(visit->element, TreeScope_Children, request->own_children, read_cache, &children);
    probe_step(request, "own", probe_result);
    if (FAILED(probe_result))
      children = NULL;
  }
  add_children(request, references, visit, visit_count, children, TRUE, &taken, &is_going);
  if (is_going) {
    HRESULT probe_result = IUIAutomationElement_FindAllBuildCache(visit->element, TreeScope_Children, request->other_children, app_cache, &others);
    probe_step(request, "other", probe_result);
    if (SUCCEEDED(probe_result))
      add_children(request, references, visit, visit_count, others, FALSE, &taken, &is_going);
  }
  if (others != NULL)
    IUIAutomationElementArray_Release(others);
  if (children != NULL)
    IUIAutomationElementArray_Release(children);
  return is_going;
}

static void add_popup(control_request *request, control_references *references, HWND window, int *visit_count) {
  IUIAutomationElement *element = NULL;
  IUIAutomationElement *cached = NULL;
  control_row row;
  int added;
  RECT area;
  if (is_past(request->deadline) || !read_shown_frame(window, &area))
    return;
  if (SUCCEEDED(IUIAutomation2_ElementFromHandle(automation, window, &element)) && element != NULL
      && SUCCEEDED(IUIAutomationElement_BuildUpdatedCache(element, read_cache, &cached)) && cached != NULL) {
    ZeroMemory(&row, sizeof row);
    read_cached_row(cached, &row);
    row.parent = -1;
    if (is_shown_control(request, cached, &row, &area)) {
      added = add_row(request, references, cached, &row, FALSE);
      if (added >= 0)
        add_visit(visit_count, cached, added, 1, &area);
    }
  }
  if (cached != NULL)
    IUIAutomationElement_Release(cached);
  if (element != NULL)
    IUIAutomationElement_Release(element);
}

static int list_popups(const target_window *target, HWND *popups) {
  HWND window = GetTopWindow(NULL);
  int count = 0;
  while (window != NULL && window != target->window && count < MAX_CONTROL_ROOTS - 1) {
    DWORD process_id = 0;
    GetWindowThreadProcessId(window, &process_id);
    if (process_id == target->process_id && is_shown_window(window))
      popups[count++] = window;
    window = GetWindow(window, GW_HWNDNEXT);
  }
  return window == target->window ? count : 0;
}

static BOOL make_process_conditions(control_request *request, DWORD process_id) {
  IUIAutomationCondition *is_own = NULL;
  IUIAutomationCondition *is_other = NULL;
  VARIANT value;
  BOOL is_made;
  VariantInit(&value);
  value.vt = VT_I4;
  value.lVal = (LONG)process_id;
  is_made = SUCCEEDED(IUIAutomation2_CreatePropertyCondition(automation, PROPERTY_PROCESS_ID, value, &is_own))
    && SUCCEEDED(IUIAutomation2_CreateNotCondition(automation, is_own, &is_other))
    && SUCCEEDED(IUIAutomation2_CreateAndCondition(automation, control_view, is_own, &request->own_children))
    && SUCCEEDED(IUIAutomation2_CreateAndCondition(automation, control_view, is_other, &request->other_children));
  if (is_other != NULL)
    IUIAutomationCondition_Release(is_other);
  if (is_own != NULL)
    IUIAutomationCondition_Release(is_own);
  return is_made;
}

static void release_process_conditions(control_request *request) {
  if (request->other_children != NULL)
    IUIAutomationCondition_Release(request->other_children);
  if (request->own_children != NULL)
    IUIAutomationCondition_Release(request->own_children);
}

static void run_read(control_request *request) {
  control_references *references = request->has_handle ? &under_references : &whole_references;
  IUIAutomationElement *start = NULL;
  int visit_count = 0;
  int index;
  RECT area = { 0, 0, 0, 0 };
  HWND popups[MAX_CONTROL_ROOTS];
  int popup_count = 0;
  DWORD process_id = 0;
  int owner = 0;
  if (request->has_handle) {
    start = find_reference(request->handle_read, request->handle_index);
    if (start == NULL) {
      strcpy_s(request->error, MAX_ERROR_TEXT, "The control isn't one of the latest read's.");
      return;
    }
    IUIAutomationElement_AddRef(start);
    free_references(&under_references);
  } else {
    if (GetWindowThreadProcessId(request->target.window, &process_id) == 0 || process_id != request->target.process_id
        || !read_shown_frame(request->target.window, &area)) {
      strcpy_s(request->error, MAX_ERROR_TEXT, "The window isn't the target's.");
      return;
    }
    popup_count = list_popups(&request->target, popups);
    probe_step(request, "popups", popup_count);
    {
      HRESULT probe_result = IUIAutomation2_ElementFromHandle(automation, request->target.window, &start);
      probe_step(request, "fromHandle", probe_result);
    }
    if (start == NULL) {
      strcpy_s(request->error, MAX_ERROR_TEXT, "UI Automation couldn't find the window.");
      return;
    }
    free_references(&under_references);
    free_references(&whole_references);
  }
  references->read = ++control_reads;
  if (request->has_handle) {
    IUIAutomationElement *cached = NULL;
    if (FAILED(IUIAutomationElement_BuildUpdatedCache(start, find_cache, &cached)) || cached == NULL
        || FAILED(IUIAutomationElement_get_CachedBoundingRectangle(cached, &area))) {
      strcpy_s(request->error, MAX_ERROR_TEXT, "The control is gone.");
      if (cached != NULL)
        IUIAutomationElement_Release(cached);
      IUIAutomationElement_Release(start);
      return;
    }
    IUIAutomationElement_get_CachedProcessId(cached, &owner);
    IUIAutomationElement_Release(cached);
  } else
    owner = (int)request->target.process_id;
  probe_step(request, "owner", owner);
  if (!make_process_conditions(request, (DWORD)owner)) {
    strcpy_s(request->error, MAX_ERROR_TEXT, "UI Automation couldn't set up the read.");
    IUIAutomationElement_Release(start);
    release_process_conditions(request);
    return;
  }
  add_visit(&visit_count, start, -1, 0, &area);
  IUIAutomationElement_Release(start);
  for (index = popup_count - 1; index >= 0; index--)
    add_popup(request, references, popups[index], &visit_count);
  for (index = 0; index < visit_count; index++)
    if (!read_children(request, references, &control_visits[index], &visit_count))
      break;
  for (index = 0; index < visit_count; index++)
    IUIAutomationElement_Release(control_visits[index].element);
  release_process_conditions(request);
}

static void run_find(control_request *request) {
  IUIAutomationElement *element = find_reference(request->handle_read, request->handle_index);
  IUIAutomationElement *cached = NULL;
  HRESULT result;
  BOOL has_point = FALSE;
  if (element == NULL || is_app_reference(request->handle_read, request->handle_index) || is_past(request->deadline))
    return;
  result = IUIAutomationElement_BuildUpdatedCache(element, find_cache, &cached);
  if (result == UIA_E_ELEMENTNOTAVAILABLE)
    return;
  if (FAILED(result) || cached == NULL) {
    strcpy_s(request->error, MAX_ERROR_TEXT, "UI Automation couldn't read the control.");
    return;
  }
  read_cached_row(cached, &request->spot);
  request->is_spot_offscreen = is_offscreen(cached);
  if (is_past(request->deadline) || FAILED(IUIAutomationElement_GetClickablePoint(cached, &request->at, &has_point)) || !has_point) {
    request->at.x = request->spot.bounds.left + (request->spot.bounds.right - request->spot.bounds.left) / 2;
    request->at.y = request->spot.bounds.top + (request->spot.bounds.bottom - request->spot.bounds.top) / 2;
  }
  request->is_found = TRUE;
  IUIAutomationElement_Release(cached);
}

static void run_hit(control_request *request) {
  IUIAutomationElement *element = find_reference(request->handle_read, request->handle_index);
  IUIAutomationElement *at = NULL;
  int level;
  if (element == NULL || is_past(request->deadline) || FAILED(IUIAutomation2_ElementFromPoint(automation, request->at, &at)))
    return;
  for (level = 0; at != NULL && level < MAX_HIT_LEVELS && !is_past(request->deadline); level++) {
    IUIAutomationElement *parent = NULL;
    BOOL is_same = FALSE;
    if (SUCCEEDED(IUIAutomation2_CompareElements(automation, at, element, &is_same)) && is_same) {
      request->is_hit = TRUE;
      break;
    }
    if (FAILED(IUIAutomationTreeWalker_GetParentElement(raw_walker, at, &parent)))
      parent = NULL;
    IUIAutomationElement_Release(at);
    at = parent;
  }
  if (at != NULL)
    IUIAutomationElement_Release(at);
}

static BOOL are_timeouts_changed = FALSE;

static BOOL set_automation_timeouts(DWORD timeout_ms) {
  are_timeouts_changed = TRUE;
  if (FAILED(IUIAutomation2_put_ConnectionTimeout(automation, timeout_ms)) || FAILED(IUIAutomation2_put_TransactionTimeout(automation, timeout_ms)))
    return FALSE;
  are_timeouts_changed = timeout_ms != UIA_TIMEOUT_MS;
  return TRUE;
}

static BOOL limit_to_time_left(ULONGLONG deadline) {
  ULONGLONG now = GetTickCount64();
  return now < deadline && set_automation_timeouts((DWORD)(deadline - now));
}

static HWND read_element_window(IUIAutomationElement *element, ULONGLONG deadline) {
  IUIAutomationElement *at = element;
  UIA_HWND window = NULL;
  int level;
  IUIAutomationElement_AddRef(at);
  for (level = 0; at != NULL && level < MAX_HIT_LEVELS && limit_to_time_left(deadline); level++) {
    IUIAutomationElement *parent = NULL;
    if (SUCCEEDED(IUIAutomationElement_get_CurrentNativeWindowHandle(at, &window)) && window != NULL)
      break;
    window = NULL;
    if (!limit_to_time_left(deadline) || FAILED(IUIAutomationTreeWalker_GetParentElement(raw_walker, at, &parent)))
      parent = NULL;
    IUIAutomationElement_Release(at);
    at = parent;
  }
  if (at != NULL)
    IUIAutomationElement_Release(at);
  return (HWND)window;
}

static void run_focus(control_request *request) {
  IUIAutomationElement *focused = NULL;
  BOOL flag = FALSE;
  int process_id = 0;
  if (!limit_to_time_left(request->deadline) || FAILED(IUIAutomation2_GetFocusedElement(automation, &focused)) || focused == NULL)
    return;
  if (limit_to_time_left(request->deadline) && SUCCEEDED(IUIAutomationElement_get_CurrentIsPassword(focused, &flag))
      && limit_to_time_left(request->deadline) && SUCCEEDED(IUIAutomationElement_get_CurrentProcessId(focused, &process_id))) {
    request->is_focused_password = flag;
    request->focus_process_id = (DWORD)process_id;
    request->focus_window = read_element_window(focused, request->deadline);
    request->is_focus_read = TRUE;
  }
  IUIAutomationElement_Release(focused);
}

static DWORD WINAPI run_controls(LPVOID parameter) {
  BOOL is_started;
  (void)parameter;
  enter_physical_pixels();
  probe_automation_ms = GetTickCount64();
  is_started = start_automation();
  probe_automation_ms = GetTickCount64() - probe_automation_ms;
  AcquireSRWLockExclusive(&control_lock);
  for (;;) {
    control_request *request;
    while (control_pending == NULL)
      SleepConditionVariableSRW(&control_changed, &control_lock, INFINITE, 0);
    request = control_pending;
    control_pending = NULL;
    ReleaseSRWLockExclusive(&control_lock);
    probe_step(request, "taken", 0);
    if (!is_started)
      strcpy_s(request->error, MAX_ERROR_TEXT, control_failure);
    else if (are_timeouts_changed && !set_automation_timeouts(UIA_TIMEOUT_MS))
      strcpy_s(request->error, MAX_ERROR_TEXT, "UI Automation's time limits couldn't be set back.");
    else if (request->kind == CONTROL_READ)
      run_read(request);
    else if (request->kind == CONTROL_FIND)
      run_find(request);
    else if (request->kind == CONTROL_HIT)
      run_hit(request);
    else
      run_focus(request);
    probe_step(request, "ran", 0);
    probe_write(request, "thread end");
    AcquireSRWLockExclusive(&control_lock);
    request->is_finished = TRUE;
    control_busy = FALSE;
    WakeAllConditionVariable(&control_changed);
    let_go_request(request);
  }
}

static BOOL wait_for_change(ULONGLONG deadline) {
  ULONGLONG now = GetTickCount64();
  if (now >= deadline)
    return FALSE;
  SleepConditionVariableSRW(&control_changed, &control_lock, (DWORD)(deadline - now), 0);
  return TRUE;
}

static BOOL start_controls(void) {
  HANDLE thread;
  if (control_started)
    return TRUE;
  thread = CreateThread(NULL, 0, run_controls, NULL, 0, NULL);
  if (thread == NULL)
    return FALSE;
  CloseHandle(thread);
  control_started = TRUE;
  return TRUE;
}

static void execute_control(napi_env env, void *data) {
  control_request *request = (control_request *)data;
  (void)env;
  AcquireSRWLockExclusive(&control_lock);
  if (!start_controls()) {
    ReleaseSRWLockExclusive(&control_lock);
    strcpy_s(request->failure, MAX_ERROR_TEXT, "The control thread couldn't start.");
    return;
  }
  while (control_busy)
    if (!wait_for_change(request->deadline)) {
      ReleaseSRWLockExclusive(&control_lock);
      strcpy_s(request->failure, MAX_ERROR_TEXT, "The control thread is still busy with an earlier request that doesn't answer.");
      return;
    }
  control_busy = TRUE;
  InterlockedIncrement(&request->references);
  control_pending = request;
  WakeAllConditionVariable(&control_changed);
  while (!request->is_finished)
    if (!wait_for_change(request->deadline + (request->kind == CONTROL_READ ? 0 : CONTROL_GRACE_MS)))
      break;
  if (request->is_finished) {
    strcpy_s(request->failure, MAX_ERROR_TEXT, request->error);
    request->answered = request->count;
    request->answered_left_out = request->left_out;
    request->is_answer_timed_out = request->is_timed_out;
  } else {
    request->is_abandoned = TRUE;
    request->answered = request->count;
    request->answered_left_out = request->published_left_out;
    request->is_answer_timed_out = TRUE;
    probe_write(request, "abandoned");
    if (request->kind != CONTROL_READ)
      strcpy_s(request->failure, MAX_ERROR_TEXT, "UI Automation didn't answer in time.");
  }
  ReleaseSRWLockExclusive(&control_lock);
}

static DWORD read_focus_owner(const target_window *target) {
  const WCHAR *name = wcsrchr(target->image, L'\\');
  HWND content;
  DWORD process_id = 0;
  if (CompareStringOrdinal(name != NULL ? name + 1 : target->image, -1, FRAME_HOST, -1, TRUE) != CSTR_EQUAL)
    return target->process_id;
  content = FindWindowExW(target->window, NULL, CORE_WINDOW_CLASS, NULL);
  if (content == NULL || GetWindowThreadProcessId(content, &process_id) == 0)
    return target->process_id;
  return process_id;
}

static BOOL is_window_inside(const target_window *target, HWND window, DWORD process_id) {
  DWORD owner = 0;
  return window != NULL && IsChild(target->window, window) && GetWindowThreadProcessId(window, &owner) != 0 && owner == process_id;
}

static const char *check_focus(const target_window *target, DWORD focus_ms) {
  control_request *request;
  const char *reason = NULL;
  if (is_password_field(target->window))
    return REASON_PASSWORD_FIELD;
  request = (control_request *)calloc(1, sizeof(control_request));
  if (request == NULL)
    return REASON_FOCUS_UNKNOWN;
  request->references = 1;
  request->kind = CONTROL_FOCUS;
  request->target = *target;
  request->deadline = GetTickCount64() + focus_ms;
  request->probe_started = GetTickCount64();
  execute_control(NULL, request);
  if (request->failure[0] != '\0' || !request->is_focus_read)
    reason = REASON_FOCUS_UNKNOWN;
  else if (request->is_focused_password)
    reason = REASON_PASSWORD_FIELD;
  else if (request->focus_process_id != target->process_id && request->focus_process_id != read_focus_owner(target)
      && !is_window_inside(target, request->focus_window, request->focus_process_id))
    reason = REASON_FOCUS_OUTSIDE;
  let_go_request(request);
  return reason;
}

static napi_status set_row_text(napi_env env, napi_value object, const char *name, const control_row *row) {
  WCHAR handle[MAX_CONTROL_HANDLE];
  _snwprintf_s(handle, MAX_CONTROL_HANDLE, _TRUNCATE, L"%lu.%lu", (unsigned long)row->read, (unsigned long)row->index);
  return set_text(env, object, name, handle, NAPI_AUTO_LENGTH);
}

static napi_value make_control(napi_env env, const control_request *request, const control_row *row) {
  napi_value control;
  CHECK(env, napi_create_object(env, &control));
  CHECK(env, set_row_text(env, control, "handle", row));
  CHECK(env, row->parent < 0 ? set_null(env, control, "parentHandle") : set_row_text(env, control, "parentHandle", &request->rows[row->parent]));
  CHECK(env, set_number(env, control, "processId", row->process_id));
  CHECK(env, set_text(env, control, "imagePath", request->images[row->image], NAPI_AUTO_LENGTH));
  CHECK(env, set_number(env, control, "controlType", row->control_type));
  CHECK(env, set_text(env, control, "name", row->name, row->name_length));
  CHECK(env, row->has_value ? set_text(env, control, "value", row->value, row->value_length) : set_null(env, control, "value"));
  CHECK(env, set_boolean(env, control, "isEnabled", row->is_enabled));
  CHECK(env, set_boolean(env, control, "hasFocus", row->has_focus));
  CHECK(env, set_boolean(env, control, "isPassword", row->is_password));
  CHECK(env, set_boolean(env, control, "isReadOnly", row->is_read_only));
  CHECK(env, set_boolean(env, control, "isSelected", row->is_selected));
  CHECK(env, set_number(env, control, "toggleState", row->toggle_state));
  CHECK(env, set_number(env, control, "expandState", row->expand_state));
  CHECK(env, set_number(env, control, "x", row->bounds.left));
  CHECK(env, set_number(env, control, "y", row->bounds.top));
  CHECK(env, set_number(env, control, "width", row->bounds.right - row->bounds.left));
  CHECK(env, set_number(env, control, "height", row->bounds.bottom - row->bounds.top));
  return control;
}

static napi_value make_control_answer(napi_env env, const control_request *request) {
  napi_value result;
  napi_value controls;
  napi_value control;
  uint32_t index;
  if (request->kind == CONTROL_HIT) {
    CHECK(env, napi_get_boolean(env, request->is_hit != FALSE, &result));
    return result;
  }
  if (request->kind == CONTROL_FIND) {
    if (!request->is_found) {
      CHECK(env, napi_get_null(env, &result));
      return result;
    }
    CHECK(env, napi_create_object(env, &result));
    CHECK(env, set_number(env, result, "controlType", request->spot.control_type));
    CHECK(env, set_text(env, result, "name", request->spot.name, request->spot.name_length));
    CHECK(env, set_boolean(env, result, "isEnabled", request->spot.is_enabled));
    CHECK(env, set_boolean(env, result, "isOffscreen", request->is_spot_offscreen));
    CHECK(env, set_number(env, result, "x", request->at.x));
    CHECK(env, set_number(env, result, "y", request->at.y));
    return result;
  }
  CHECK(env, napi_create_object(env, &result));
  CHECK(env, napi_create_array_with_length(env, request->answered, &controls));
  for (index = 0; index < request->answered; index++) {
    control = make_control(env, request, &request->rows[index]);
    if (control == NULL)
      return NULL;
    CHECK(env, napi_set_element(env, controls, index, control));
  }
  CHECK(env, napi_set_named_property(env, result, "controls", controls));
  CHECK(env, set_number(env, result, "leftOut", request->answered_left_out));
  CHECK(env, set_boolean(env, result, "timedOut", request->is_answer_timed_out));
  return result;
}

static void complete_control(napi_env env, napi_status status, void *data) {
  control_request *request = (control_request *)data;
  napi_value result = NULL;
  if (status == napi_ok && request->failure[0] == '\0')
    result = make_control_answer(env, request);
  if (result != NULL)
    napi_resolve_deferred(env, request->deferred, result);
  else
    reject_error(env, request->deferred, request->failure[0] != '\0' ? request->failure : "The controls couldn't be handed over.");
  napi_delete_async_work(env, request->work);
  let_go_request(request);
}

static BOOL parse_handle(const char *text, uint32_t *read, uint32_t *index) {
  char *end = NULL;
  unsigned long first;
  unsigned long second;
  if (text[0] < '0' || text[0] > '9')
    return FALSE;
  first = strtoul(text, &end, 10);
  if (*end != '.' || end[1] < '0' || end[1] > '9')
    return FALSE;
  second = strtoul(end + 1, &end, 10);
  if (*end != '\0' || first > UINT32_MAX || second > UINT32_MAX)
    return FALSE;
  *read = (uint32_t)first;
  *index = (uint32_t)second;
  return TRUE;
}

static napi_value read_handle(napi_env env, napi_value value, control_request *request) {
  char text[MAX_CONTROL_HANDLE];
  size_t length = 0;
  CHECK(env, napi_get_value_string_utf8(env, value, text, sizeof text, &length));
  if (length == 0 || length >= sizeof text - 1 || !parse_handle(text, &request->handle_read, &request->handle_index)) {
    napi_throw_type_error(env, ERROR_CODE, "The control's handle isn't one a read gave.");
    return NULL;
  }
  request->has_handle = TRUE;
  return value;
}

static napi_value read_timeout(napi_env env, napi_value value, control_request *request) {
  uint32_t timeout_ms = 0;
  CHECK(env, napi_get_value_uint32(env, value, &timeout_ms));
  if (timeout_ms == 0 || timeout_ms > MAX_CONTROL_TIMEOUT_MS) {
    napi_throw_range_error(env, ERROR_CODE, "The time limit must be from 1 to 60,000 milliseconds.");
    return NULL;
  }
  request->deadline = GetTickCount64() + timeout_ms;
  request->probe_started = GetTickCount64();
  return value;
}

static napi_value queue_control(napi_env env, control_request *request, const char *name) {
  napi_value resource_name;
  napi_value promise;
  if (napi_create_string_utf8(env, name, NAPI_AUTO_LENGTH, &resource_name) != napi_ok
      || napi_create_async_work(env, NULL, resource_name, execute_control, complete_control, request, &request->work) != napi_ok) {
    let_go_request(request);
    throw_pending(env);
    return NULL;
  }
  if (napi_create_promise(env, &request->deferred, &promise) != napi_ok || napi_queue_async_work(env, request->work) != napi_ok) {
    napi_delete_async_work(env, request->work);
    let_go_request(request);
    throw_pending(env);
    return NULL;
  }
  return promise;
}

static control_request *new_control_request(napi_env env, control_kind kind) {
  control_request *request = (control_request *)calloc(1, sizeof(control_request));
  if (request != NULL && kind == CONTROL_READ) {
    request->rows = (control_row *)calloc(MAX_READ_CONTROLS, sizeof(control_row));
    if (request->rows == NULL) {
      free(request);
      request = NULL;
    }
  }
  if (request == NULL) {
    napi_throw_error(env, ERROR_CODE, "The request's memory couldn't be allocated.");
    return NULL;
  }
  request->references = 1;
  request->kind = kind;
  return request;
}

static napi_value read_controls(napi_env env, napi_callback_info info) {
  napi_value arguments[3];
  napi_valuetype type;
  control_request *request = new_control_request(env, CONTROL_READ);
  if (request == NULL)
    return NULL;
  if (read_arguments(env, info, 3, arguments) == NULL || read_target(env, arguments[0], &request->target) == NULL
      || napi_typeof(env, arguments[1], &type) != napi_ok || (type != napi_null && read_handle(env, arguments[1], request) == NULL)
      || read_timeout(env, arguments[2], request) == NULL) {
    throw_pending(env);
    let_go_request(request);
    return NULL;
  }
  return queue_control(env, request, "readControls");
}

static napi_value find_control(napi_env env, napi_callback_info info) {
  napi_value arguments[3];
  control_request *request = new_control_request(env, CONTROL_FIND);
  if (request == NULL)
    return NULL;
  if (read_arguments(env, info, 3, arguments) == NULL || read_target(env, arguments[0], &request->target) == NULL
      || read_handle(env, arguments[1], request) == NULL || read_timeout(env, arguments[2], request) == NULL) {
    let_go_request(request);
    return NULL;
  }
  return queue_control(env, request, "findControl");
}

static napi_value hits_control(napi_env env, napi_callback_info info) {
  napi_value arguments[5];
  control_request *request = new_control_request(env, CONTROL_HIT);
  if (request == NULL)
    return NULL;
  if (read_arguments(env, info, 5, arguments) == NULL || read_target(env, arguments[0], &request->target) == NULL
      || read_handle(env, arguments[1], request) == NULL || read_point(env, arguments[2], arguments[3], &request->at) == NULL
      || read_timeout(env, arguments[4], request) == NULL) {
    let_go_request(request);
    return NULL;
  }
  return queue_control(env, request, "hitsControl");
}

NAPI_MODULE_INIT() {
  napi_property_descriptor properties[] = {
    { "listDisplays", NULL, list_displays, NULL, NULL, NULL, napi_enumerable, NULL },
    { "captureWindow", NULL, capture_window, NULL, NULL, NULL, napi_enumerable, NULL },
    { "getForegroundWindow", NULL, get_foreground_window, NULL, NULL, NULL, napi_enumerable, NULL },
    { "listWindows", NULL, list_windows, NULL, NULL, NULL, napi_enumerable, NULL },
    { "readPointer", NULL, read_pointer, NULL, NULL, NULL, napi_enumerable, NULL },
    { "glidePointer", NULL, glide_pointer, NULL, NULL, NULL, napi_enumerable, NULL },
    { "movePointer", NULL, move_pointer, NULL, NULL, NULL, napi_enumerable, NULL },
    { "click", NULL, click, NULL, NULL, NULL, napi_enumerable, NULL },
    { "drag", NULL, drag, NULL, NULL, NULL, napi_enumerable, NULL },
    { "scroll", NULL, scroll, NULL, NULL, NULL, napi_enumerable, NULL },
    { "typeText", NULL, type_text, NULL, NULL, NULL, napi_enumerable, NULL },
    { "pressKey", NULL, press_key, NULL, NULL, NULL, napi_enumerable, NULL },
    { "startMonitor", NULL, start_monitor, NULL, NULL, NULL, napi_enumerable, NULL },
    { "stopMonitor", NULL, stop_monitor, NULL, NULL, NULL, napi_enumerable, NULL },
    { "showBorder", NULL, show_border, NULL, NULL, NULL, napi_enumerable, NULL },
    { "hideBorder", NULL, hide_border, NULL, NULL, NULL, napi_enumerable, NULL },
    { "listAppPaths", NULL, list_app_paths, NULL, NULL, NULL, napi_enumerable, NULL },
    { "describeProgram", NULL, describe_program, NULL, NULL, NULL, napi_enumerable, NULL },
    { "readProgramIcon", NULL, read_program_icon, NULL, NULL, NULL, napi_enumerable, NULL },
    { "readControls", NULL, read_controls, NULL, NULL, NULL, napi_enumerable, NULL },
    { "findControl", NULL, find_control, NULL, NULL, NULL, napi_enumerable, NULL },
    { "hitsControl", NULL, hits_control, NULL, NULL, NULL, napi_enumerable, NULL },
    { "personInputBeforeNextSend", NULL, person_input_before_next_send, NULL, NULL, NULL, napi_enumerable, NULL }
  };
  if (napi_define_properties(env, exports, sizeof properties / sizeof properties[0], properties) != napi_ok
      || napi_add_env_cleanup_hook(env, end_monitor_on_exit, NULL) != napi_ok
      || napi_add_env_cleanup_hook(env, end_border_on_exit, NULL) != napi_ok) {
    throw_pending(env);
    return NULL;
  }
  AcquireSRWLockExclusive(&control_lock);
  start_controls();
  ReleaseSRWLockExclusive(&control_lock);
  return exports;
}
