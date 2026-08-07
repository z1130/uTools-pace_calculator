<template>
  <!-- 内容区 -->
  <div>
    <div class="border-2 border-solid border-purple-200 rounded-3xl p-6">
      <div
        class="mb-8 py-2 px-4 bg-purple-200 bg-opacity-30 rounded-md border-l-4 border-solid border-purple-200"
      >
        <div class="mb-4 text-2xl">跑步配速计算器</div>
        <div class="text-sm">
          只需在下面的配速计算器中输入【时长】、【距离】或【配速】中任意两个变量即可确定您的3公里、5公里、10公里、马拉松配速或给定距离的每公里配速。
        </div>
      </div>
      <div class="calculator_container mb-2">
        <div class="title text-sm font-bold mb-2">时长</div>
        <div class="flex">
          <div class="mr-1 w-full">
            <el-input-number
              v-model="time.hour"
              :min="0"
              :precision="0"
              controls-position="right"
              placeholder="hh"
              class="mb-1"
              size="large"
            />
            <span class="ml-1 mb-2 text-xs text-gray-400">小时</span>
          </div>
          <div class="mr-1 w-full">
            <el-input-number
              v-model="time.min"
              :min="0"
              :max="59"
              :precision="0"
              controls-position="right"
              placeholder="mm"
              class="mb-1"
              size="large"
            />
            <span class="ml-1 mb-2 text-xs text-gray-400">分钟</span>
          </div>
          <div class="mr-1 w-full">
            <el-input-number
              v-model="time.sec"
              :min="0"
              :max="59"
              :precision="0"
              controls-position="right"
              placeholder="ss"
              class="mb-1"
              size="large"
            />
            <span class="ml-1 mb-2 text-xs text-gray-400">秒</span>
          </div>
          <el-button
            ref="timeBtn"
            color="#626aef"
            @click="calculate('time')"
            size="large"
            >计算时长</el-button
          >
        </div>
      </div>
      <div class="calculator_container mb-2">
        <div class="title text-sm font-bold mb-2">距离</div>
        <div class="flex">
          <div class="mr-1 w-full">
            <el-input-number
              v-model="distance.dis_value"
              @change="disValueChange"
              :min="0"
              :precision="4"
              controls-position="right"
              placeholder="公里"
              size="large"
            />
            <span class="ml-1 mb-2 text-xs text-gray-400">公里</span>
          </div>
          <el-select
            v-model="distance.dis_type"
            @change="disTypeChange"
            placeholder="项目"
            class="w-5/12 mr-1"
            size="large"
          >
            <el-option
              v-for="item in projectOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-button
            ref="distanceBtn"
            color="#626aef"
            @click="calculate('distance')"
            size="large"
            >计算距离</el-button
          >
        </div>
      </div>
      <div class="calculator_container">
        <div class="title text-sm font-bold mb-2">配速</div>
        <div class="flex">
          <div class="mr-1 w-full">
            <el-input-number
              v-model="pace.min"
              :min="0"
              :max="59"
              :precision="0"
              controls-position="right"
              placeholder="mm"
              class="mb-1"
              size="large"
            />
            <span class="ml-1 mb-2 text-xs text-gray-400">分钟</span>
          </div>
          <div class="mr-1 w-full">
            <el-input-number
              v-model="pace.sec"
              :min="0"
              :max="59"
              :precision="0"
              controls-position="right"
              placeholder="ss"
              class="mb-1"
              size="large"
            />
            <span class="ml-1 mb-2 text-xs text-gray-400">秒</span>
          </div>
          <el-button
            ref="paceBtn"
            color="#626aef"
            @click="calculate('pace')"
            size="large"
            >计算配速</el-button
          >
        </div>
      </div>
    </div>
  </div>
  <div class="mt-4 flex justify-center items-center">
    <el-button ref="resetBtn" color="#6c757d" @click="reset" size="large"
      >重置</el-button
    >
  </div>
  <!-- 弹框 -->
  <el-dialog
    v-model="centerDialogVisible"
    width="300px"
    center
    :show-close="false"
    :close-on-click-modal="false"
  >
    <div>
      <div>
        <div
          class="text-sm font-normal text-gray-400 border-b border-gray-400 border-dotted"
        >
          时长
        </div>
        <div class="text-3xl font-thin text-gray-500 text-right">
          <span>{{ time.hour }}:{{ time.min }}:{{ time.sec }}</span>
        </div>
      </div>
      <div>
        <div
          class="text-sm font-normal text-gray-400 border-b border-gray-400 border-dotted"
        >
          距离
        </div>
        <div class="text-3xl font-thin text-gray-500 text-right">
          <span>{{ distance.dis_value }}</span>
          <span class="text-current"> 公里</span>
        </div>
      </div>
      <div>
        <div
          class="text-sm font-normal text-gray-400 border-b border-gray-400 border-dotted"
        >
          配速
        </div>
        <div class="text-3xl font-thin text-gray-500 text-right">
          <span>{{ pace.min }}'{{ pace.sec }}"</span>
          <span class="text-current"> 每公里</span>
        </div>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button color="#626aef" @click="dialogConfirm" size="large"
          >确认</el-button
        >
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { throttle, stringHandle } from '@/utils/zhy'
import { useDark } from '@vueuse/core'
import { ref, reactive, toRefs, getCurrentInstance } from 'vue'
const isDark = useDark()
const { proxy } = getCurrentInstance()
// 弹框
const centerDialogVisible = ref(false)
// 项目下拉数据
const projectOptions = [
  {
    value: 1,
    label: '3公里',
  },
  {
    value: 2,
    label: '5公里',
  },
  {
    value: 3,
    label: '10公里',
  },
  {
    value: 4,
    label: '半程马拉松',
  },
  {
    value: 5,
    label: '全程马拉松',
  },
]

// 数据
const data = reactive({
  distance: {
    dis_value: null,
    dis_type: null,
  },
  time: {
    hour: null,
    min: null,
    sec: null,
  },
  pace: {
    min: null,
    sec: null,
  },
})
const { distance, time, pace } = toRefs(data)

// 计算，加入节流2s内事件只能触发一次
const calculate = throttle((type) => {
  // 计算时先将值都变成number类型
  let timeHour = time.value.hour ? parseInt(time.value.hour) : 0
  let timeMin = time.value.min ? parseInt(time.value.min) : 0
  let timeSec = time.value.sec ? parseInt(time.value.sec) : 0
  let paceMin = pace.value.min ? parseInt(pace.value.min) : 0
  let paceSec = pace.value.sec ? parseInt(pace.value.sec) : 0
  switch (type) {
    case 'time': // time = pace * distance
      if (
        distance.value.dis_value == null ||
        distance.value.dis_value == 0 ||
        (pace.value.min == null && pace.value.sec == null)
      ) {
        ElNotification.warning({
          message: '计算【时长】，请输入【距离】和【配速】',
          showClose: false,
        })
        return
      }
      var pacesec = paceMin * 60 + paceSec * 1
      var totalsec = pacesec * distance.value.dis_value
      var hour = Math.floor(totalsec / 3600)
      var min = Math.floor((totalsec - hour * 3600) / 60)
      var sec = Math.floor(totalsec % 60)
      time.value.hour = hour
      time.value.min = min
      time.value.sec = sec
      handle()
      break
    case 'distance': // distance = time / pace
      if (
        (time.value.hour == null &&
          time.value.min == null &&
          time.value.sec == null) ||
        (pace.value.min == null && pace.value.sec == null)
      ) {
        ElNotification.warning({
          message: '计算【距离】，请输入【时长】和【配速】',
          showClose: false,
        })
        return
      }
      var totalsec = timeHour * 3600 + timeMin * 60 + timeSec * 1
      var pacesec = paceMin * 60 + paceSec * 1
      var dis = totalsec / pacesec
      distance.value.dis_value = parseFloat(dis.toFixed(2))
      handle()
      break
    case 'pace': // pace = time / distance
      if (
        distance.value.dis_value == null ||
        distance.value.dis_value == 0 ||
        (time.value.hour == null &&
          time.value.min == null &&
          time.value.sec == null)
      ) {
        ElNotification.warning({
          message: '计算【配速】，请输入【时长】和【距离】',
          showClose: false,
        })
        return
      }
      var totalsec = timeHour * 3600 + timeMin * 60 + timeSec * 1
      var pacesec = totalsec / distance.value.dis_value
      var pacemin = Math.floor(pacesec / 60)
      var pacesec = Math.floor(pacesec % 60)
      pace.value.min = pacemin
      pace.value.sec = pacesec
      handle()
      break
  }
}, 1000)

// 处理数据没填的问题
const handle = () => {
  time.value.hour = stringHandle(
    time.value.hour ? String(time.value.hour) : '0',
    2,
    '0'
  )
  time.value.min = stringHandle(
    time.value.min ? String(time.value.min) : '0',
    2,
    '0'
  )
  time.value.sec = stringHandle(
    time.value.sec ? String(time.value.sec) : '0',
    2,
    '0'
  )
  pace.value.min = stringHandle(
    pace.value.min ? String(pace.value.min) : '0',
    2,
    '0'
  )
  pace.value.sec = stringHandle(
    pace.value.sec ? String(pace.value.sec) : '0',
    2,
    '0'
  )
  centerDialogVisible.value = true
}

// 项目切换
const disTypeChange = (val) => {
  switch (val) {
    case 1:
      distance.value.dis_value = 3
      break
    case 2:
      distance.value.dis_value = 5
      break
    case 3:
      distance.value.dis_value = 10
      break
    case 4:
      distance.value.dis_value = 21.0975
      break
    case 5:
      distance.value.dis_value = 42.195
      break
  }
}

// 距离输入改变
const disValueChange = (val) => {
  switch (val) {
    case 3:
      distance.value.dis_type = 1
      break
    case 5:
      distance.value.dis_type = 2
      break
    case 10:
      distance.value.dis_type = 3
      break
    case 21.0975:
      distance.value.dis_type = 4
      break
    case 42.195:
      distance.value.dis_type = 5
      break
    default:
      distance.value.dis_type = null
      break
  }
}

// 重置按钮
const reset = () => {
  distance.value = {
    dis_value: null,
    dis_type: null,
  }
  time.value = {
    hour: null,
    min: null,
    sec: null,
  }
  pace.value = {
    min: null,
    sec: null,
  }
  // 解决el-button点击后不恢复原样
  proxy.$refs.timeBtn.$el.blur()
  proxy.$refs.distanceBtn.$el.blur()
  proxy.$refs.paceBtn.$el.blur()
  proxy.$refs.resetBtn.$el.blur()
}

// 关闭弹框
const dialogConfirm = () => {
  centerDialogVisible.value = false
}

// 进入插件执行的事件
utools.onPluginEnter(({ code, type, payload }) => {})
// 退出插件执行的事件
utools.onPluginOut(() => {
  reset()
})
</script>

<style lang="scss" scoped></style>
