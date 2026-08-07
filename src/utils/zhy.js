/**
 * 实现函数节流（单位时间内事件只能触发一次）
 *  - 语法: throttle(callback, wait)
 *  - 功能: 创建一个节流函数，在 wait 毫秒内最多执行 `callback` 一次
 *  - 场景：窗口调整（resize）、页面滚动（scroll）、DOM 元素的拖拽功能实现（mousemove）、抢购疯狂点击（click）
 * @param {function} callback 
 * @param {number} wait 
 * @returns function
 */
export function throttle(callback, wait) {
  let start = 0
  // 返回一个事件监听函数(也就是节流函数)
  return function (event) {
    // 只有当距离上次处理的时间间隔超过了wait时, 才执行处理事件的函数
    const current = Date.now()
    if (current - start > wait) {
      callback.call(this, event) // 需要指定this和参数
      start = current
    }
  }
}

/**
 * 将数字不足2位的前面补0
 * @param {string} str 字符串
 * @param {number} targetLength 目标字符串的长度
 * @param {string} padString 是可选的，它表示用来填充当前字符串的字符串。如果不指定该参数，则默认使用空格填充
 * @returns string
 */
export function stringHandle(str, targetLength, padString) {
  return str.padStart(targetLength, padString)
}