<template>
  <div class="main_app">
    <div class="one_item">
      <span>快捷抓取(Alt/Option + C)</span>
      <el-switch
        v-model="isCopyOpen"
        active-text=""
        inactive-text=""
      ></el-switch>
    </div>
    <div class="one_item">
      <span>截图(Ctrl/Command+Shift + X) </span>
      <el-switch
        v-model="isCropOpen"
        active-text=""
        inactive-text=""
      ></el-switch>
    </div>
    <div class="one_item">
      <span>颜色拾取(Alt/Option + X) </span>
      <el-switch
        v-model="isPickColor"
        active-text=""
        inactive-text=""
      ></el-switch>
    </div>
  </div>
</template>

<script lang="js">
import { sendMessageToBg } from "@/scripts/messageUtil";
import { STORAGEKEY } from "@/scripts/contants";
export default {
  name: "app",
  data() {
    return {
      isCropOpen: false,
      isCopyOpen: false,
      isPickColor: false
    };
  },
  created() {
    chrome.storage.local.get([STORAGEKEY.IS_COPY_OPEN], (res) => {
      this.isCopyOpen = res[STORAGEKEY.IS_COPY_OPEN];
    });
    chrome.storage.local.get([STORAGEKEY.IS_CROP_OPEN], (res) => {
      this.isCropOpen = res[STORAGEKEY.IS_CROP_OPEN];
    });
    chrome.storage.local.get([STORAGEKEY.IS_PICK_COLOR], (res) => {
      this.isPickColor = res[STORAGEKEY.IS_PICK_COLOR];
    });
  },
  methods: {},
  watch: {
    isCopyOpen(b) {
      sendMessageToBg({ type: "changeCopyStatus", data: b });
    },
    isCropOpen(b) {
      sendMessageToBg({ type: "changeCropStatus", data: b });
    },
    isPickColor(b){
      sendMessageToBg({ type: "changePickerStatus", data: b });
    }
  },
};
</script>

<style>
.main_app {
  width: 200px;
  font-size: 16px;
  padding: 10px;
}
body {
  padding: 0;
  margin: 0;
}
.main_app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
<style scoped>
.one_item {
  height: 40px;
  display: flex;
  font-size: 12px;
  justify-content: space-between;
  align-items: center;
}
.one_item:not(:last-child) {
  border-bottom: 1px solid #ccc;
}
</style>
