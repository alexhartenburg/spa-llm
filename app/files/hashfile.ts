// WORK ON PROPERLY TYPING THE FUNCTION ARGUMENTS AND RETURNS

const hashFile = async(file: File): Promise<string> => {
    var resultHex = ''
    await readBinaryFile(file)
    .then((result: any) => {
      result = new Uint8Array(result);
      return window.crypto.subtle.digest('SHA-256', result);
    })
    .then((result: any) => {
      result = new Uint8Array(result);
      resultHex = uint8ArrayToHexString(result);
    });
    return resultHex;
}

const readBinaryFile = (file: File): any => {
    return new Promise((resolve, reject) => {
      var fr = new FileReader();
      fr.onload = () => {
        resolve(fr.result)
      };
      fr.readAsArrayBuffer(file);
    });
  }
  
  function uint8ArrayToHexString(ui8array: any) {
    var hexstring = '',
      h;
    for (var i = 0; i < ui8array.length; i++) {
      h = ui8array[i].toString(16);
      if (h.length == 1) {
        h = '0' + h;
      }
      hexstring += h;
    }
    var p = Math.pow(2, Math.ceil(Math.log2(hexstring.length)));
    hexstring = hexstring.padStart(p, '0');
    return hexstring;
  }

  export default hashFile;