import { Readable } from "stream"
import path from "path"

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
  endpoint: "http://localhost:8000",
});

export const webhook = (event, context, callback) => {
  callback(null, "ok");
};

export const s3hook = (event, context) => {
  const received_key = event.Records[0].s3.object.key;
  const get_param = {
    Bucket: "local-bucket",
    Key: received_key,
  };
  const filename = path.basename(received_key);

  const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });

  client
    .send(new GetObjectCommand(get_param))
    .then((data) => streamToBuffer(data.Body))
    .then(async (data) => {
      // Redimensiona a imagem usando Jimp
      const image = await Jimp.read(data);
      image.resize(320, Jimp.AUTO);
      return image.getBufferAsync(Jimp.MIME_JPEG);
    })
    .then((data) => {
      const put_param = {
        Bucket: "local-bucket",
        Key: `processed/${filename}`,
        Body: data,
      };
      return client.send(new PutObjectCommand(put_param));
    })
    .then(() => context.done())
    .catch((err) => context.done("fail"));
};
