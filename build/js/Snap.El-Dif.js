/*

How to use:

Snap connects an element->template->data->controller


Snap.loadTemplate([
	'ingredient',
	'recipe',
	'recipes'
],{
	baseUrl:'tmpl/', 
	ext:'.html'
})


1) Drop elements on page:
	<div data-tmpl="my-data"></div>

	- by default this element watches for changes in the data 'my-data'.
	- by default the controller is a generic link that watches the 'my-data' and triggers a redraw on change
	- to customize which data the element watches, set the attribute 'data-watch':
		<div data-tmpl="my-data" data-watch="custom-data"></div>


2) Add templates
	Snap.setTemplate('my-data','{{name}}');

3) Add data

	Snap.setData([KEY],[DATA],[OPTIONS]);

	KEY: reference name of data object

	DATA: new data object

	OPTIONS: tweak the update process

		- deep:true (default false): 
			true: uses $.extend(true,OLD-DATA, DATA)
			false: uses $.extend(OLD-DATA, DATA)

		- overwrite:true (default false)
			true: replace data entirely
			false: runs $.extend on the old data
	
	Usage:

	Snap.setData('my-data',{name:"My Object Name"});

	Snap.setData('my-data',{name:"My Object Name"},{overwrite:true});


Options:

1) Intialize a data set with some helpers...

	Snap.setDataConfig('my-data',{
		useLocalStorage:true, // save this locally for when user returns
		defaultData:[], // set default value
		process:function(data){ // use pass-through function on save to manage data set
			return $.grep(data,function(e){
				return e!==null; // example: remove nulls from array
			})
		}
	});

2) Watch data changes for making page updates
	Snap.watchData('saved-recipes',onChangeSavedRecipes);

3) Add a custom controller for elements

	
	function CustomController(el){
		// config holds data for this piece
		var config = getElementConfig(el);

		function renderElement(data){
			config.$el.html(config.tmpl(data));
			render(config.$el);
		}

		watchData(config.dataKey,renderElement);

	}
	Snap.setController();


*/
var SnapEvents = {
	CHANGE:'snap-change'
}

var Snap = (function(){

	//
	//
	//
	//
	/*

	var _ = {}

	function diff(fromHTML, toEl){
		var tmplKey = $(toEl).attr('data-tmpl')
		if(tmplKey==='recipe-list') console.log('diff',tmplKey)
		if(fromHTML!==toEl){
			var $from = $('<div>').append(fromHTML)
			var $to = $(toEl)
			if(tmplKey==='recipe-list') console.log('-->',tmplKey,$from)

			var f = $from.children()
			var t = $to.children()
			if(tmplKey==='recipe-list') console.log('-->',tmplKey,f.length,t.length)

			if(f.length!==t.length){
				$to.empty().append(f)
			} else {
				var i = t.length
				while(i--){
					if(t[i].outerHTML()!==f[i].outerHTML()){
						t[i].replaceWith(f[i])
					}
				}
			}
		}
	}


	function matchAttributes(el1,el2){
		var a,i,n,v
		var changed = false

		if(el1.attributes.length>0){
			a = el1.attributes
			i = a.length
			while(i--){
				n = a[i].name
				v = a[i].value
				if(v!==(el2.getAttribute(n) || "")){
					el2.setAttribute(n,v)
					changed = true
					//changed.push('set '+n+'='+v)
				}
			}
			a = el2.attributes
			i = a.length
			while(i--){
				n = a[i].name
				if(!el1.hasAttribute(n)){
					el2.removeAttribute(n)
					changed = true
					//changed.push('remove '+n)
				}
			}
		} else {
			a = el2.attributes
			i = a.length
			while(i--){
				n = a[i].name
				el2.removeAttribute(n)
				changed = true
				//changed.push('remove '+n)
			}
		}
		console.log('attr changed',changed)
		return changed
	}

	_.matchAttributes = matchAttributes

	function compareEls(el1,el2){
		

		if(el1.tagName!==el2.tagName){
			// replace
			$(el1).replaceWith(el2)
			return
		} else {
			matchAttributes(el1,el2)
		}
		
		if(el1.innerHTML!==el2.innerHTML){
			if(el1.children.length!==el2.children.length){
				// replace
				el2.innerHTML = el1.innerHTML
			} else if(el1.children.length>0 && el2.children.length>0){
				//var i = 
			}
		}
	}
	_.compareEls = compareEls

	function diffLoop(fromEl, toEl, depth){
		console.log('diffLoop',$(toEl).attr('data-tmpl'))
		if(depth===null) depth = 0
		var $from = $(fromEl)
		var $to = $(toEl)

		if($from.html()===$to.html()){
			console.log('no change',fromEl)
			$to.empty().append($from.html())
		}
		var f = $from.children()
		var t = $to.children()

		if(f.length===0 || t.length===0 || f.length!==t.length){
			$to.empty().append(f)
			return
		}

		//if(t[i].outerHTML()!==f[i].outerHTML()){
		var h1,h2,changed
		var i = t.length
		while(i--){
			h1 = $(t[i]).html()
			h2 = $(f[i]).html()
			changed = h1!==h2
			console.log(i,'t',h1)
			console.log(i,'f',h2)
			//console.log(i,'t',$(t[i]).html(),'f',$(f[i]).html())
			console.log(i,'changed',changed)
			if(changed===true){
				diffLoop(f[i], t[i])
			}
		}
	}

	*/

	//
	//
	//
	//
	//

	var SnapData = function(config){

		var self = this
		var config = $.extend({
			data:null
		},config || {})
		var data = config.data
		var processes = []
		var listeners = {}

		function dispatchEvent(eventType){
			if(listeners[eventType]){
				var i = listeners[eventType].length
				while(i--){
					listeners[eventType][i].callback.call(self, self.getData(), {type:eventType, target:self})
				}
				$(window).trigger('snap-'+eventType,[{key:config.dataKey, type:config.dataType, snapData:self}])
			}
		}

		function on(eventType,callback){
			if(!listeners[eventType]){
				listeners[eventType] = []
			}
			listeners[eventType].push({
				callback:callback
			})
			return callback
		}

		function off(eventType, callback){
			if(listeners[eventType]){
				var i = listeners[eventType].length
				while(i--){
					if(callback===null || callback===listeners[eventType][i].callback){
						listeners[eventType].splice(i,1)
					}
				}
			}
		}

		function setData(update, options){

			var currentData = JSON.stringify(data)
			var changed = false

			if(update){
				if(options && options.overwrite===true){
					data = update
				} else if($.isFunction(update)){
					data = update(data)
				} else {
					if(!$.isPlainObject(update)){
						data = update
					} else {
						data = $.extend(options && options.deep, data, update)
					}
				}
			}
			processData()

			// verify data changed before dispatching event
			if(JSON.stringify(data)!==currentData){
				dispatchEvent('change')
				changed = true
			}
			// should support custom event triggers ?
			// if(options && options.customEvent){
			// 	dispatchEvent(options.customEvent)
			// }

			if(options && options.callback){
				options.callback(data)
			}

			return {
				changed:function(cb){
					if(changed){
						if(cb) cb(data, JSON.parse(currentData))
					} else {
						console.log('no change detected')
					}
				},
				then:function(cb, changed){
					if(cb) cb(data, JSON.parse(currentData))
				}
			}
			//return data
		}

		function getData(update){
			return data
		}

		function processData(){
			var i = processes.length
			while(i--){
				data = processes[i].func(data)
			}
		}

		function setProcess(func, index){
			processes.push({func:func, index:index || 999})
			processes.sort(function(a,b){
				return a.index<b.index ? -1 : a.index>b.index ? 1 : 0
			})
			processData()
			return true
		}

		function removeProcess(func, index){
			var i = processes.length
			while(i--){
				if(processes[i].func===func){
					processes.splice(i,1)
					return true
				}
			}
			return false
		}

		self.on = on
		self.off = off
		self.getData = getData
		self.setData = setData
		self.setProcess = setProcess
		self.removeProcess = removeProcess
	}

	function SnapElement(el, config){
		var $el = $(el)
		var config = config || {}
		var tmplKey = config.tmpl || getAttr(el,'data-tmpl','')
		var dataKey = config.data || getAttr(el,'data-watch',tmplKey)
		var ctrlKey = config.ctrl || getAttr(el,'data-ctrl',tmplKey)
		var filterKey = config.filter || getAttr(el,'data-filter','')
		var snapIndex = snaps.push(this)-1
		var tmplIndex = 0
		var innerHTML = ''

		function info(){
			return {
				el:el,
				$el:$el,
				tmplKey:tmplKey,
				dataKey:dataKey,
				ctrlKey:ctrlKey,
				filterKey:filterKey,
				snapIndex:snapIndex
			}
		}

		function setTmplKey(key){
			tmplKey = key
			render()
		}

		function setDataKey(key){
			dataKey = key
			render()
		}

		function empty(){
			$el.empty()
		}

		function render(){
			//empty()
			var t = getTemplate(tmplKey)
			var d = getData(dataKey)
			var f = getFilter(filterKey)
			var newHTML = t(f(d,el))
			
			//diff(newHTML,$el)
			//diffLoop($('<div>').append(newHTML),$el)

			if(newHTML!==innerHTML){
				$el.html(newHTML)
				innerHTML = newHTML
			}
			Snap.render($el,0)
		}

		function init(){
			$el.attr('snap-index',snapIndex)
			getDataObject(dataKey).on('change',render)
			getTemplateObject(tmplKey).on('change',render)
			render()
		}

		function kill(){
			getDataObject(dataKey).off('change',render)
		}
		this.render = render
		this.empty = empty
		this.info = info
		this.setTmplKey = setTmplKey
		this.setDataKey = setDataKey
		init()
	}
	//
	// vars
	//

	var self = this
	var snaps = []
	var filters = {}
	var tmpls = {}
	var datas = {}

	function getAttr(el,attr,defaultValue){
		var $el = $(el)
		return $el[0].hasAttribute(attr) ? $el.attr(attr) : defaultValue
	}

	function isDomElement(e){
		return e instanceof jQuery || (e && e.tagName)
	}

	function getSnapElement(el,createIfNotExists){
		if(isDomElement(el)){
			var $container = $(el)
			var snapIndex = getAttr(el,'snap-index',false)
			if(!snapIndex){
				$container = $(el).parentsUntil('[snap-index]')
			}
			if($container.length>0){
				snapIndex = parseInt($container.attr('snap-index'))
				return snaps[snapIndex]
			} else if(createIfNotExists){
				return new SnapElement(el)
			}
		}
		return null
	}

	//
	// data objects
	//

	function getDataObject(key){
		var s = getSnapElement(key,true)
		if(s){
			key = s.info().dataKey
		}
		if(!datas[key]){
			datas[key] = new SnapData({dataType:'data', dataKey:key})
		}
		return datas[key]
	}

	function setData(key, data, options){
		if(isDomElement(key)){
			var s = getSnapElement(key)
			s.setDataKey(data)
			return
		}
		return getDataObject(key).setData(data, options)
	}

	function getData(key){
		return getDataObject(key).getData()
	}

	//
	// data filters
	//

	function defaultFilter(data){
		return data
	}

	function getFilterObject(key){
		var s = getSnapElement(key,true)
		if(s){
			key = s.info().filterKey
		}
		if(!filters[key]){
			filters[key] = new SnapData({dataKey:key, dataType:'filter', data:defaultFilter})
		}
		return filters[key]
	}

	function setFilter(key, data){
		return getFilterObject(key).setData(data, {overwrite:true})
	}

	function getFilter(key){
		return getFilterObject(key).getData()
	}

	//
	// data processors
	//

	function setProcess(key, func, options){
		getDataObject(key).setProcess(func,options)
	}

	function removeProcess(key, func, options){
		getDataObject(key).removeProcess(func)
	}

	//
	// templates
	//

	function defaultTemplate(data){
		return JSON.stringify(data)
	}

	function getTemplateObject(key){
		var s = getSnapElement(key,true)
		if(s){
			key = s.info().tmplKey
		}
		if(!tmpls[key]){
			tmpls[key] = new SnapData({dataKey:key, dataType:'tmpl', data:defaultTemplate})
		}
		return tmpls[key]
	}

	function setTemplate(key, data){
		if(isDomElement(key)){
			var s = getSnapElement(key)
			s.setTmplKey(data)
			return
		}
		if($.type(data)==='string'){
			data = Handlebars.compile(data)
			Handlebars.registerPartial(key,data)
		}
		return getTemplateObject(key).setData(data,{overwrite:true})
	}

	function getTemplate(key){
		return getTemplateObject(key).getData()
	}

	function getTemplates(){
		return tmpls
	}

	//
	//
	//

	function watchData(key, func){
		// console.log('watchData',key)
		getDataObject(key).on('change',func)
	}

	function unwatchData(watcher){
		getDataObject(key).off('change',func)
	}

	function render(container,depth){
		$('[data-tmpl]:not([snap-index])',container || 'html').each(function(i,e){
			// console.log('Snap.render()',i,e)
			new SnapElement(e)
		})
	}

	function refresh(container){
		$('[snap-index]',container || 'body').each(function(i,e){
			var snapIndex = parseInt($(e).attr('snap-index'))
			snaps[snapIndex].render()
		})
	}

	//
	// load template
	//

	function loadTemplate(files, config){
		var config = $.extend({
			baseUrl:'',
			name:'',
			ext:'.html'
		},config || {})

		if(!$.isArray(files)){
			files = [files]
		}
		$.when.apply($,$.map(files, function(f){

			if($.type(f)==='string'){
				f = {url:config.baseUrl+f+config.ext, key:f}
			} else {
				f.filename = f.filename || f.key
				f.url = f.url || config.baseUrl+f.filename+config.ext
				f.key = f.key || f.filename || f.url.split('/').pop().split('.')[0]
			}

			return $.ajax({
				url:f.url,
				config:f
			})
		    .done(function(content) {
				Snap.setTemplate(this.config.key,content)
		    })
		    .fail(function() {
		        console.error('Could not load template',this.config)
		    })
		})).done(function(){
			console.log('done loading templates')
		})
	}

	//
	// AJAX Request
	//

	var requestQueue = [];
	var requestStatus = 0;

	function handleAjaxComplete(data){
		if(this.process){
			data = this.process(data)
		}
		if(this.dataKey){
			setData(this.dataKey,data,{overwrite:this.overwrite===true})
		}
		if(this.callback){
			this.callback(data)
		}
		requestStatus = 0
		if(requestQueue.length){
			nextRequest()
		}
	}

	function handleAjaxError(){
		console.log('Snap.handleAjaxError() There was an error')
		this.data = {error:true, errorMessage:'Unknown error.'}
		handleAjaxComplete(this)
	}

	function nextRequest(){
		if(requestStatus>0) return;
		requestStatus = 1
		var entry = requestQueue.pop()

		$.ajax($.extend({
			dataType:'json',
			error:handleAjaxError,
			success:handleAjaxComplete 
		},entry))
	}

	function request(info){
		requestQueue.push(info)
		nextRequest()
	}

	$(document).ready(function(){
		render()
	})

	return {
		//_:_,
		request:request,
		refresh:refresh,
		render:render,
		setData:setData,
		setTemplate:setTemplate,
		getTemplate:getTemplates,
		getTemplates:getTemplates,
		setFilter:setFilter,
		setData:setData,
		getData:getData,
		setProcess:setProcess,
		removeProcess:removeProcess,
		element:SnapElement,
		watchData:watchData,
		unwatchData:unwatchData,
		loadTemplate:loadTemplate
	}
})()