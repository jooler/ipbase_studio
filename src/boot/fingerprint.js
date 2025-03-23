import FingerprintJS from '@fingerprintjs/fingerprintjs'
;(async () => {
  const fp = await FingerprintJS.load() // 加载 FingerprintJS
  const result = await fp.get() // 获取指纹数据
  const fingerprint = result.visitorId // 提取唯一标识符

  //   console.log('fingerprint', fingerprint)
  window.fingerprint = fingerprint
})()
