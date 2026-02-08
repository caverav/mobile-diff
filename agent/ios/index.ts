// @ts-nocheck
/* eslint-disable */

interface NSData {
  bytes(): NativePointer;
  length(): number;
  isNull(): boolean;
}

interface NSURL {
  path(): string;
}

// Expand tilde paths
function expandTilde(path: string): string {
  if (!path.startsWith("~")) return path;
  const home = ObjC.classes.NSHomeDirectory().toString();
  return path.replace(/^~/, home);
}

// Create zip of directory using NSFileCoordinator
export function zipDirectory(path: string): string | null {
  try {
    const expandedPath = expandTilde(path);
    const folderURL = ObjC.classes.NSURL.fileURLWithPath_(expandedPath);

    // Check if path exists
    const fileManager = ObjC.classes.NSFileManager.defaultManager();
    if (!fileManager.fileExistsAtPath_(expandedPath)) {
      return null;
    }

    const coordinator = ObjC.classes.NSFileCoordinator.alloc().initWithFilePresenter_(NULL);
    let zipURL: NSURL | null = null;
    let error = Memory.alloc(Process.pointerSize);
    Memory.writePointer(error, NULL);

    coordinator.coordinateReadingItemAtURL_options_error_byAccessor_(
      folderURL,
      1, // NSFileCoordinatorReadingForUploading
      error,
      new ObjC.Block({
        retType: 'void',
        argTypes: ['object'],
        implementation: (newURL: NSURL) => {
          zipURL = newURL;
        }
      })
    );

    if (zipURL === null) {
      return null;
    }

    return zipURL.path().toString();
  } catch (e) {
    console.error(`Failed to zip directory ${path}:`, e);
    return null;
  }
}

// Capture UserDefaults
export function captureUserDefaults(): Record<string, any> {
  try {
    const defaults = ObjC.classes.NSUserDefaults.standardUserDefaults();
    const dict = defaults.dictionaryRepresentation();
    const result: Record<string, any> = {};

    const enumerator = dict.keyEnumerator();
    let key: any;
    while ((key = enumerator.nextObject()) !== null) {
      const value = dict.objectForKey_(key);
      result[key.toString()] = parseObjCValue(value);
    }

    return result;
  } catch (e) {
    console.error("Failed to capture UserDefaults:", e);
    return {};
  }
}

// Capture Cookies
export function captureCookies(): any[] {
  try {
    const storage = ObjC.classes.NSHTTPCookieStorage.sharedHTTPCookieStorage();
    const cookies = storage.cookies();
    const count = cookies.count();
    const result: any[] = [];

    for (let i = 0; i < count; i++) {
      const cookie = cookies.objectAtIndex_(i);
      result.push({
        name: cookie.name().toString(),
        value: cookie.value().toString(),
        domain: cookie.domain().toString(),
        path: cookie.path().toString(),
        expiresDate: cookie.expiresDate()?.description().toString() || null,
        isSecure: !!cookie.isSecure(),
        isHTTPOnly: !!cookie.isHTTPOnly(),
      });
    }

    return result;
  } catch (e) {
    console.error("Failed to capture cookies:", e);
    return [];
  }
}

// Capture Keychain (basic info only, not actual secrets)
export function captureKeychain(): any[] {
  try {
    const query = ObjC.classes.NSMutableDictionary.alloc().init();
    query.setObject_forKey_(ObjC.classes.__NSCFConstantString.stringWithString_("kSecClassGenericPassword"), "kSecClass");
    query.setObject_forKey_(ObjC.classes.__NSCFConstantString.stringWithString_("kSecMatchLimitAll"), "kSecMatchLimit");
    query.setObject_forKey_(ObjC.classes.__NSCFBoolean.numberWithBool_(1), "kSecReturnAttributes");

    const result = Memory.alloc(Process.pointerSize);
    Memory.writePointer(result, NULL);

    const status = ObjC.classes.SecItemCopyMatching(query, result);
    if (status !== 0) {
      return [];
    }

    const items = new ObjC.Object(Memory.readPointer(result));
    if (!items || items.isNull()) {
      return [];
    }

    const count = items.count();
    const entries: any[] = [];

    for (let i = 0; i < count; i++) {
      const item = items.objectAtIndex_(i);
      entries.push({
        account: item.objectForKey_("acct")?.toString() || null,
        service: item.objectForKey_("svce")?.toString() || null,
        label: item.objectForKey_("labl")?.toString() || null,
        accessGroup: item.objectForKey_("agrp")?.toString() || null,
        creationDate: item.objectForKey_("cdat")?.description().toString() || null,
        modificationDate: item.objectForKey_("mdat")?.description().toString() || null,
        type: "GenericPassword",
      });
    }

    return entries;
  } catch (e) {
    console.error("Failed to capture keychain:", e);
    return [];
  }
}

// Capture Pasteboard
export function capturePasteboard(): any[] {
  try {
    const pasteboard = ObjC.classes.UIPasteboard.generalPasteboard();
    const items = pasteboard.items();
    const count = items.count();
    const result: any[] = [];

    for (let i = 0; i < count; i++) {
      const item = items.objectAtIndex_(i);
      const enumerator = item.keyEnumerator();
      let key: any;
      while ((key = enumerator.nextObject()) !== null) {
        const value = item.objectForKey_(key);
        result.push({
          type: key.toString(),
          content: value?.description().toString() || "",
        });
      }
    }

    return result;
  } catch (e) {
    console.error("Failed to capture pasteboard:", e);
    return [];
  }
}

// Helper to parse ObjC values
function parseObjCValue(value: any): any {
  if (!value || value.isNull()) return null;

  const className = value.$className;

  if (className === "NSNumber" || className === "__NSCFNumber" || className === "__NSCFBoolean") {
    return value.doubleValue();
  } else if (className === "NSString" || className === "__NSCFString" || className === "NSTaggedPointerString") {
    return value.toString();
  } else if (className === "NSArray" || className === "__NSArrayI" || className === "__NSArrayM") {
    const arr: any[] = [];
    const count = value.count();
    for (let i = 0; i < count; i++) {
      arr.push(parseObjCValue(value.objectAtIndex_(i)));
    }
    return arr;
  } else if (className === "NSDictionary" || className === "__NSDictionaryI" || className === "__NSDictionaryM") {
    const dict: Record<string, any> = {};
    const enumerator = value.keyEnumerator();
    let key: any;
    while ((key = enumerator.nextObject()) !== null) {
      dict[key.toString()] = parseObjCValue(value.objectForKey_(key));
    }
    return dict;
  } else if (className === "NSData" || className === "__NSCFData" || className === "NSConcreteData") {
    return `<Data: ${value.length()} bytes>`;
  } else if (className === "NSDate" || className === "__NSDate" || className === "__NSTaggedDate") {
    return value.description().toString();
  } else {
    return value.description().toString();
  }
}

// Main snapshot function
export function createSnapshot(scopes: string[]): any {
  const zipPaths: Record<string, string> = {};

  // Zip each scope
  for (const scope of scopes) {
    const zipPath = zipDirectory(scope);
    if (zipPath) {
      zipPaths[scope] = zipPath;
    }
  }

  // Capture app data
  const appData = {
    userDefaults: captureUserDefaults(),
    cookies: captureCookies(),
    keychain: captureKeychain(),
    pasteboard: capturePasteboard(),
  };

  return {
    zipPaths,
    appData,
    timestamp: new Date().toISOString(),
  };
}

rpc.exports = {
  createSnapshot,
  zipDirectory,
  captureUserDefaults,
  captureCookies,
  captureKeychain,
  capturePasteboard,
};
