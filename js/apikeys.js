export const apiKeys = {
  danbooru: ["uerqPatsej3oeAX1qsRAJr1Y", "ryqdXz7h5MYReNAg8ogj3RGD"], // if you have one
  rule34: [],   // no key needed for rule34; leave empty if not used
  yande: []     // no key needed for yande.re; leave empty if not used
  // Waifu.pics does not require an API key.
};

const indices = {
  danbooru: 0,
  rule34: 0,
  yande: 0
};

export function getNextApiKey(apiType = 'rule34') {
  const keys = apiKeys[apiType] || [];
  if (keys.length === 0) {
    return "";
  }
  const key = keys[indices[apiType]];
  indices[apiType] = (indices[apiType] + 1) % keys.length;
  return key;
}
