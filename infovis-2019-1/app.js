var app = new Vue({
  el: '#app-vue',
  mounted() {
  	for(let i = 0; i<visualizations.length; i++){
  		let plotly_component = document.getElementById('visualization'+i)
     	Plotly.plot(plotly_component, visualizations[i].data, visualizations[i].layout)
  	}
  }
})