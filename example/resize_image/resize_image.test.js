import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import Jimp from "jimp";

const client = new S3Client({
  forcePathStyle: true,
  credentials: {
    accessKeyId: "S3RVER",
    secretAccessKey: "S3RVER",
  },
  endpoint: `http://localhost:8000`,
  region: "us-east-1",
});

const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

it("jpeg resize", async () => {

  // Cria uma imagem vermelha 640x640 usando Jimp
  const image = new Jimp(640, 640, 0xff0000ff); // RGBA
  const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);

  await client.send(
    new PutObjectCommand({
      Bucket: "local-bucket",
      Key: "incoming/img.jpg",
      Body: buffer,
    })
  );

  await sleep(3000);


  // Verifica se a imagem foi redimensionada corretamente
  const { Body: stream } = await client.send(
    new GetObjectCommand({ Bucket: "local-bucket", Key: "processed/img.jpg" })
  );
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const processedBuffer = Buffer.concat(chunks);
  const processedImage = await Jimp.read(processedBuffer);
  expect(processedImage.bitmap.width).toEqual(320);
});
