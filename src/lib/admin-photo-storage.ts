import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function saveAdminPhoto(file: File) {
  const uploadsDirectory = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDirectory, { recursive: true });

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const filename = `${crypto.randomUUID()}.${extension}`;
  const filePath = path.join(uploadsDirectory, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  return `/uploads/${filename}`;
}
