const RednomicKeyParser = key => {
  let unitId, actionName, fileIndex, id;
  let str = key.split("-");
  if (str.length > 3) {
    unitId = str[0];
    actionName = str[1];
    fileIndex = str[str.length - 2];
    id = str[str.length - 1];
  } else {
    unitId = str[0];
    fileIndex = str[str.length - 2];
    id = str[str.length - 1];
  }
  return { unitId, actionName, fileIndex, id };
};

export { RednomicKeyParser };
