// AI contribution: Below 50% AI-generated
import { zipFile } from "@/test-utils/zip";
import {
  MAX_SUBMISSION_SIZE_BYTES,
  validateSubmissionArchive,
} from "./submission-archive";

describe("validateSubmissionArchive", () => {
  it("accepts a ZIP with main.ts at its root", async () => {
    await expect(validateSubmissionArchive(zipFile(["main.ts"]))).resolves.toEqual({
      ok: true,
    });
  });

  it("rejects a non-ZIP extension", async () => {
    await expect(
      validateSubmissionArchive(zipFile(["main.ts"], "agent.txt")),
    ).resolves.toMatchObject({ ok: false, status: 415 });
  });

  it("rejects malformed ZIP data", async () => {
    const bytes = Uint8Array.from("not a zip", (character) =>
      character.charCodeAt(0),
    );
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const file = new File([buffer], "agent.zip", { type: "application/zip" });
    if (typeof file.arrayBuffer !== "function") {
      Object.defineProperty(file, "arrayBuffer", {
        value: async () => buffer.slice(0),
      });
    }

    await expect(validateSubmissionArchive(file)).resolves.toMatchObject({
      ok: false,
      status: 415,
    });
  });

  it("requires main.ts at the archive root", async () => {
    await expect(
      validateSubmissionArchive(zipFile(["src/main.ts"])),
    ).resolves.toEqual({
      ok: false,
      status: 422,
      error:
        "Invalid ZIP structure.\nExpected:\nagent.zip\n└── main.ts\nmain.ts must be at the top level, not inside src/ or another folder.",
    });
  });

  it("rejects a ZIP that cannot be read", async () => {
    const file = {
      name: "agent.zip",
      size: 100,
      arrayBuffer: jest.fn().mockRejectedValue(new Error("read failed")),
    } as unknown as File;

    await expect(validateSubmissionArchive(file)).resolves.toMatchObject({
      ok: false,
      status: 415,
    });
  });

  it("rejects archives larger than 8 MiB before reading them", async () => {
    const readArchive = jest.fn();
    const file = {
      name: "agent.zip",
      size: MAX_SUBMISSION_SIZE_BYTES + 1,
      arrayBuffer: readArchive,
    } as unknown as File;

    await expect(validateSubmissionArchive(file)).resolves.toMatchObject({
      ok: false,
      status: 413,
    });
    expect(readArchive).not.toHaveBeenCalled();
  });
});
