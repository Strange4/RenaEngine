// AI contribution: Below 50% AI-generated
function writeUint16(bytes: Uint8Array, offset: number, value: number) {
  new DataView(bytes.buffer).setUint16(offset, value, true);
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  new DataView(bytes.buffer).setUint32(offset, value, true);
}

export function emptyZip(entryNames: string[]): Uint8Array {
  const names = entryNames.map((name) =>
    Uint8Array.from(name, (character) => character.charCodeAt(0)),
  );
  const localSize = names.reduce((total, name) => total + 30 + name.length, 0);
  const centralSize = names.reduce((total, name) => total + 46 + name.length, 0);
  const bytes = new Uint8Array(localSize + centralSize + 22);

  let localOffset = 0;
  let centralOffset = localSize;
  for (const name of names) {
    writeUint32(bytes, localOffset, 0x04034b50);
    writeUint16(bytes, localOffset + 4, 20);
    writeUint16(bytes, localOffset + 26, name.length);
    bytes.set(name, localOffset + 30);

    writeUint32(bytes, centralOffset, 0x02014b50);
    writeUint16(bytes, centralOffset + 4, 20);
    writeUint16(bytes, centralOffset + 6, 20);
    writeUint16(bytes, centralOffset + 28, name.length);
    writeUint32(bytes, centralOffset + 42, localOffset);
    bytes.set(name, centralOffset + 46);

    localOffset += 30 + name.length;
    centralOffset += 46 + name.length;
  }

  writeUint32(bytes, centralOffset, 0x06054b50);
  writeUint16(bytes, centralOffset + 8, names.length);
  writeUint16(bytes, centralOffset + 10, names.length);
  writeUint32(bytes, centralOffset + 12, centralSize);
  writeUint32(bytes, centralOffset + 16, localSize);
  return bytes;
}

export function zipFile(
  entryNames: string[],
  name = "agent.zip",
): File {
  const bytes = emptyZip(entryNames);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const file = new File([buffer], name, { type: "application/zip" });
  if (typeof file.arrayBuffer !== "function") {
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => buffer.slice(0),
    });
  }
  return file;
}
