const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {assetPath,pdfArguments}=require('./paths.cjs');
test('PDF file associations accept mixed-case paths',()=>{assert.deepEqual(pdfArguments(['Cangjing.exe','測試.PDF'],'D:\\books'),['D:\\books\\測試.PDF']);});
test('file association arguments support Chinese names, spaces, and uppercase extensions',()=>{assert.deepEqual(pdfArguments(['Cangjing.exe','--flag','書 籍.PDF','unsupported.epub'],'D:\\books'),['D:\\books\\書 籍.PDF']);});
test('application assets stay inside packaged reader',()=>{const root=path.resolve('reader');assert.equal(assetPath(root,'reader://app/index.html'),path.join(root,'index.html'));assert.throws(()=>assetPath(root,'reader://app/%2e%2e%5csecret'));assert.throws(()=>assetPath(root,'https://app/index.html'));});
