import Vue from "vue";
import AppComponent from "./App/App.vue";
import { Switch } from "element-ui";
import "element-ui/lib/theme-chalk/index.css";

Vue.component("app-component", AppComponent);
Vue.use(Switch);
new Vue({
  el: "#app",
  render: (createElement) => {
    return createElement(AppComponent);
  },
});
