require('dotenv').config();

const fs = require('fs');
const util = require('util');
const {Storage} = require('@google-cloud/storage');
const clipboardy = require('clipboardy');

const BUCKET = process.env.BUCKET || 'bucket';
const WATCH_DIR = `${process.env.HOME}/Screenshots`;
const FILE_PATTERN = /^Screen .+\.png$/;

const watch = util.promisify(fs.watch);
const storage = new Storage();
const bucket = storage.bucket(BUCKET);

async function upload(pathname) {
  return bucket.upload(pathname, {
    metadata: {
      cacheControl: 'public, max-age=31536000',
    }
  });
}

async function getSignedUrl(filename) {
  const [url] = await bucket.file(filename).getSignedUrl({
    action: 'read',
    expires: Date.now() + 604800 * 1000, // 7 days max
    responseDisposition: 'inline',
  });

  return url;
}

async function handle(event, filename) {
  if (event === 'rename' && FILE_PATTERN.test(filename)) {
    const pathname = `${WATCH_DIR}/${filename}`;
    const start = Date.now();
    console.time(`Upload '${pathname}'`)

    await upload(pathname);
    const url = await getSignedUrl(filename);

    await clipboardy.write(url);
    const end = Date.now();
    console.log('%sms: Upload %o to %o', (end - start).toFixed(0), pathname, url);
  }
}

watch(
  WATCH_DIR,
  { persistent: true },
  handle
);
