import { uid } from 'quasar'
import Artplayer from 'artplayer'
export const useMedia = () => {
  const getVideoDuration = (url) => {
    return new Promise((resolve) => {
      const domId = uid()
      // 创建临时div用于获取视频时长
      const tmpDiv = document.createElement('div')
      tmpDiv.id = domId
      tmpDiv.className = `tmpplayer-${domId}`
      tmpDiv.style.display = 'none'
      document.body.appendChild(tmpDiv)

      let art = new Artplayer({
        container: `.tmpplayer-${domId}`,
        url: url,
      })

      art.on('ready', () => {
        const duration = art.duration
        setTimeout(() => {
          // 销毁播放器实例
          art.destroy()
          // 移除临时DOM元素
          if (tmpDiv && tmpDiv.parentNode) {
            document.body.removeChild(tmpDiv)
          }
        }, 1000)
        console.log('获取视频时长', duration)
        resolve(duration)
      })

      // 添加错误处理和超时机制
      art.on('error', () => {
        console.warn('获取视频时长出错')
        // 销毁播放器实例
        art.destroy()
        // 移除临时DOM元素
        if (tmpDiv && tmpDiv.parentNode) {
          document.body.removeChild(tmpDiv)
        }
        resolve(30) // 出错时返回默认时长
      })

      // 设置超时，防止长时间挂起
      setTimeout(() => {
        if (art) {
          console.warn('获取视频时长超时')
          // 检查播放器是否已销毁
          try {
            art.destroy()
          } catch (e) {
            console.warn('销毁播放器失败', e)
          }
          // 移除临时DOM元素
          if (tmpDiv && tmpDiv.parentNode) {
            document.body.removeChild(tmpDiv)
          }
          resolve(30) // 超时时返回默认时长
        }
      }, 30000) // 10秒超时
    })
  }

  // 缓存视频并获取时长
  const cacheVideo = async (url) => {
    try {
      const duration = await getVideoDuration(url)
      return {
        success: true,
        duration,
      }
    } catch (error) {
      console.error('缓存视频失败:', error)
      return {
        success: false,
        url: url,
        duration: 30,
      }
    }
  }
  // 从视频文件列表中获取最小分辨率的视频
  const getMinResolutionVideo = (videoFiles) => {
    if (!videoFiles || videoFiles.length === 0) return null
    // return videoFiles[0]x c

    return videoFiles.reduce((min, current) => {
      const currentWidth = parseInt(current.width) || Infinity
      const minWidth = parseInt(min.width) || Infinity
      return currentWidth < minWidth ? current : min
    })
  }
  return { getVideoDuration, cacheVideo, getMinResolutionVideo }
}
