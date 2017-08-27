var Snap = (function(){

	var SnapData = function(config){

		var self = this
		var config = $.extend({
			data:{}
		},config || {})
		var data = config.data
		var listeners = {}
		var processes = []

		function dispatchEvent(eventType){
			if(listeners[eventType]){
				var i = listeners[eventType].length
				while(i--){
					listeners[eventType][i].callback.call(self, {type:eventType, target:self})
				}
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
			dispatchEvent('change')
			return data
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

		function empty(){
			$el.empty()
		}

		function render(){
			empty()
			var t = getTemplate(tmplKey)
			var d = getData(dataKey)
			var f = getFilter(filterKey)
			try {
				$el.html(t(f(d,el)))
			} catch(err) {
				$el.html('Error')
			}
			Snap.render($el,0)
		}

		function init(){
			$el.attr('snap-index',snapIndex)
			getDataObject(dataKey).on('change',render)
			getTemplateObject(dataKey).on('change',render)
			render()
		}

		function kill(){
			getDataObject(dataKey).off('change',render)
		}
		this.render = render
		this.empty = empty
		this.info = info
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

	function getInfo(el,prop){
		if(isDomElement(el)){
			var $container = $(el).parents().addBack().find('[snap-index]')
			if($container.length>0){
				snapIndex = parseInt($container.attr('snap-index'))
				return snaps[snapIndex].info()
			} else {
				return new SnapElement(el)
			}
		}
		return null
	}

	//
	// data objects
	//

	function getDataObject(key){
		var info = getInfo(key)
		if(info){
			key = info.dataKey
		}
		if(!datas[key]){
			datas[key] = new SnapData()
		}
		return datas[key]
	}

	function setData(key, data, options){
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
		var info = getInfo(key)
		if(info){
			key = info.filterKey
		}
		if(!filters[key]){
			filters[key] = new SnapData({data:defaultFilter})
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
		var info = getInfo(key)
		if(info){
			key = info.tmplKey
		}
		if(!tmpls[key]){
			tmpls[key] = new SnapData({data:defaultTemplate})
		}
		return tmpls[key]
	}

	function setTemplate(key, data){
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
		console.log('watchData',key)
		getDataObject(key).on('change',func)
	}

	function unwatchData(watcher){
		getDataObject(key).off('change',func)
	}

	function render(container,depth){
		$('[data-tmpl]:not([snap-index])',container || 'body').each(function(i,e){
			console.log('Snap.render()',i,e)
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

	/*

	Snap.loadTemplate([
		'ingredient',
		'recipe',
		'recipes'
	],{
		baseUrl:'tmpl/', 
		ext:'.html'
	})

	*/
	function loadTemplate(files, config){
		var config = $.extend({
			baseUrl:'',
			name:'',
			ext:'.html'
		},config || {})

		if(!$.isArray(files)){
			files = [files]
		}
		var i = files.length
		
		while(i--){

			var f = files[i]
			if($.type(f)==='string'){
				f = {url:config.baseUrl+f+config.ext, key:f}
			} else {
				f.filename = f.filename || f.key
				f.url = f.url || config.baseUrl+f.filename+config.ext
				f.key = f.key || f.filename || f.url.split('/').pop().split('.')[0]
			}

			$.ajax({
				url:f.url,
				config:f
			})
		    .then(function(content) {
				Snap.setTemplate(this.config.key,content)
		    })
		    .fail(function() {
		        console.error('Could not load template',this.config)
		    })
		}
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
		//if(debug>0) console.log('Snap.request()',entry)

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



// var JSONFilter = (function(){

// 	var filter = [{id:[1,4]}]

// 	var data = [
// 		{
// 			id:2
// 		},
// 		{
// 			id:3
// 		},
// 		{
// 			id:1
// 		},
// 		{
// 			id:4
// 		}
// 	]

// 	var f = filter
// 	var d = data

// 	function dig(f,d){
// 		for(var _f in f){
// 			for(var _d in d){
// 				if(typeof(_f)===typeof(_d)){
// 					return dig(_f,_d)
// 				} else {
// 					return {f:_f, d:_d}
// 				}
// 			}
// 		}
// 	}

// 	dig(filter,data)

// })()

// var Snap2 = (function(){

// 	var DATAS = {}

// 	function isElement(e){
// 		return key instanceof jQuery || (key && key.tagName)
// 	}

// 	function Controller(config){
// 	}

// 	function setData(key,delta,options){

// 		var isElement = isElement(key)
// 		var dataKey = isElement(key) ? getElementDataKey(key) : key
// 		var isFunction = $.isFunction(delta)
// 		var options = $.extend({
// 			overwrite:false, 
// 			triggerChange:true
// 		},options || {})
// 		var dataBefore = getData(dataKey)
// 		var dataAfter = isFunction ? delta(currentData) : $.extend({},delta)

// 		if(key instanceof jQuery || (key && key.tagName)){
// 			key = getElementDataKey(key);
// 		}
// 		if(debug) console.log('Snap.setData()',key);//,data);if(debug>0) 
// 		// init config if not set
// 		if(!dataConfig[key]){
// 			dataConfig[key] = {changed:true};
// 		}
// 		var config = dataConfig[key];
// 		config.changeIndex++;

// 		options = $.extend({overwrite:false, triggerChange:true},options || {});
// 		var update = data;
// 		var currentData = getData(key);

// 		if($.isFunction(data)){
// 			update = data(currentData);
// 		} else {
// 			if(datas[key] && options.overwrite!==true){
// 				switch($.type(datas[key])){
// 					case 'array' :
// 						if($.type(data)==='array'){
// 							// needs to support update id
// 						}
// 						update = data;
// 						break;
// 					case 'object' :
// 						if(options.deep===true){
// 							update = $.extend(true,{},currentData,data);
// 						} else {
// 							update = $.extend({},currentData,data);
// 						}
// 						break;
// 					case 'string' :
// 					case 'number' :
// 					default :
// 						update = data;
// 				}
// 			} else {
// 				update = data;
// 			}
// 		}
// 		// run process if specified
// 		if(config.process){
// 			try {
// 				update = config.process(update,currentData);
// 			} catch(err) {
// 				if(debug) console.error('Snap.setData() config.process',key);
// 			}
// 		}
// 		if(processors[key]){
// 			//var i = processors[key].length;
// 			for(var i=0; i<processors[key].length; i++){
// 			//while(i--){
// 				update = processors[key][i](update,currentData);
// 			}
// 		}
// 		//if(debug) console.log('--> ','update',update);
// 		// commit data
// 		datas[key] = update;

// 		// save to local storage if config.useLocalStorage === true
// 		if(config.useLocalStorage){
// 			window.localStorage.setItem(key, JSON.stringify(update));
// 		}

// 		if(options.triggerChange!==false){
// 			dispatchChange(key);
// 		}
// 	}
// }

// var xSnap = (function(){
// 	var debug = 0;
// 	var controls = {};
// 	var templates = {};
// 	var watchers = {};
// 	var watchersReuse = {};
// 	var datas = {};
// 	var dataConfig = {};
// 	var processors = {};
// 	var requestQueue = [];
// 	var requestStatus = 0;
// 	var elementIndex = 0;
// 	var elementRef = [];
// 	var controlInstance = [];

// 	// internal helper
// 	function getAttribute($e,key,defaultValue){
// 		if($e[0].hasAttribute(key)){
// 			var attr = $e.attr(key);
// 			if(attr){
// 				return attr;
// 			}
// 		}
// 		return defaultValue;
// 	}

// 	// default setting
// 	function defaultTemplate(data){
// 		return JSON.stringify(data);
// 	}

// 	function cleanupElement(el){
// 		// kill watchers
// 		var ctrl,c,w;
// 		$('[snap-ctrl]',el).each(function(i,e){
// 			ctrl = getElementController(e);
// 			c = ctrl.getConfig();
// 			w = ctrl.getWatcherIndex();
// 			// remove from watches
// 			watchers[c.dataKey][w] = null;
// 			// get slot ready for reuse
// 			if(!watchersReuse[c.dataKey]){
// 				watchersReuse[c.dataKey] = [];
// 			}
// 			watchersReuse[c.dataKey].push(w);
// 		})
// 	}

// 	function defaultController(el){
// 		var config = getElementConfig(el);

// 		function renderElement(data){
// 			//config = getDataConfig(config.dataKey)
// 			cleanupElement(config.$el);
// 			config.$el.html(getTemplate(config.tmpl)(data))
// 			config.$el.attr(data && data.attr ? data.attr : {})
	
// 			render(config.$el);
// 			var dataConfigInfo = getDataConfig(config.dataKey)
// 			if(dataConfigInfo.afterRender){
// 				dataConfigInfo.afterRender(config.$el,data)
// 			}
// 		}

// 		function setConfig(update){
// 			$.extend(config,update);
// 			refresh();
// 		}

// 		function getConfig(update){
// 			return config;
// 		}

// 		function refresh(){
// 			renderElement(getData(config.dataKey));
// 		}

// 		var watcherIndex = watchData(config.dataKey,renderElement);

// 		function getWatcherIndex(){
// 			return watcherIndex;
// 		}

// 		return {
// 			setConfig:setConfig,
// 			getConfig:getConfig,
// 			getWatcherIndex:getWatcherIndex
// 		}
// 	}

// 	function setController(key,func){
// 		controls[key] = func;
// 	}

// 	function getController(key){
// 		return controls[key] || defaultController;
// 	}

// 	function getControlInstance(i){
// 		return controlInstance[parseInt(i)];
// 	}

// 	function getElementController(el){
// 		var i;
// 		var hasCtrl = $(el)[0].hasAttribute('snap-ctrl');
// 		if(hasCtrl){
// 			i = $(el).attr('snap-ctrl');
// 			return getControlInstance(i);
// 		} else {
// 			var p = $(el).parents('[snap-ctrl]');

// 			if(p.length>0){
// 				i = $(p).attr('snap-ctrl');
// 				return getControlInstance(i);
// 			}
// 		}
// 		return null;
// 	}

// 	function getElementConfig(e){
// 		var $e = $(e);
// 		var el  = $(e)[0];
// 		var hasTmpl = el.hasAttribute('data-tmpl');

// 		//if(!hasTmpl) return false;

// 		if(!hasTmpl){
// 			$e = $e.parents('[data-tmpl]');
// 		}
// 		if($e.length===0){
// 			return false;
// 		} else {
// 			el = $e[0];
// 		}

// 		var hasRef = el.hasAttribute('data-ref');
// 		var refIndex,ref;

// 		if(hasRef){
// 			refIndex = parseInt($e.attr('data-ref'));
// 		} else {
// 			refIndex = elementIndex++;

// 			var tmpl = getAttribute($e,'data-tmpl','defaultTemplate');
// 			var ctrl = getAttribute($e,'data-ctrl',tmpl);
// 			var dataKey = getAttribute($e,'data-watch',tmpl);

// 			elementRef[refIndex] = {
// 				index:refIndex,
// 				$el:$(e),
// 				el:$(e)[0],
// 				tmpl:tmpl,
// 				ctrl:getController(ctrl),
// 				dataKey:dataKey,
// 				lastRendered:0, 
// 				rendered:false,
// 				initialized:false,
// 				changeIndex:null
// 			};
// 			$e.attr('data-ref',refIndex);
// 		}
// 		ref = elementRef[refIndex];
// 		return ref;
// 	}

// 	function render(e,depth){
// 		if(debug>3) console.log('Snap.render()',depth);
// 		if(!e) e = document.body;
// 		if(depth>20) return;
// 		var $e = $(e);
// 		var config = getElementConfig(e);

// 		if(config && config.initialized===false){
// 			// init controllers on elements
// 			config.initialized = true;
// 			$e.attr('snap-ctrl',controlInstance.push(new config.ctrl(e))-1);
// 		}

// 		depth = (depth || 0)+1;

// 		$('[data-tmpl]',e).each(function(i,ee){
// 			render(ee,depth);
// 		});
// 	}

// 	function setTemplate(key,data){
// 		if(debug>1) console.log('Snap.setTemplate()',key);//,data);
// 		templates[key] = $.type(data)==='string' ? Handlebars.compile(data) : data;
// 		Handlebars.registerPartial(key,templates[key]);
// 		dispatchChange(key);
// 	}

// 	function getTemplate(key){
// 		return templates[key] || defaultTemplate;
// 	}

// 	function watchData(key,cb){
// 		if(debug>1) console.log('watchData',key);
// 		if(!watchers[key]){
// 			watchers[key] = [];
// 		}
// 		var watchIndex;

// 		// lets reuse watch index to avoid bloat in the array
// 		if(watchersReuse[key] && watchersReuse[key].length>0){
// 			watchIndex = watchersReuse[key].pop();
// 			watchers[key][watchIndex] = cb;
// 		} else {
// 			watchIndex = watchers[key].push(cb)-1;
// 		}

// 		//var watchIndex = watchers[key].push(cb)-1;
// 		var data = getData(key);
// 		// putting this here makes the nav disappear - not sure the root cause
// 		//if(data!==null){
// 			cb(data);
// 		//} else {
// 		//}
// 		return watchIndex;
// 	}

// 	function audit(){
// 		var i = 0;
// 		for(var e in watchers){
// 			i += watchers[e].length;
// 		}
// 		console.log('TOTAL WATCHERS:',i);
// 	}

// 	function dispatchChange(key){
// 		if(debug>2) console.log('Snap.dispatchChange()',key);
// 		if(!watchers[key]) return;
// 		var data = getData(key);
// 		// don't trigger render on null data
// 		if(!data) return;
// 		var i = watchers[key].length;
// 		while(i--){
// 			if(watchers[key][i]) watchers[key][i](data);
// 		}
// 	}

// 	function setDataConfig(key,info){
// 		if(debug>1) console.log('Snap.setDataConfig',key);//, datas[key])
// 		var config = dataConfig[key] = $.extend(getDataConfig(key), info);

// 		if(info.defaultValue){
// 			alert('Snap update: Change defaultValue to defaultData in '+key );
// 		}

// 		// if(datas[key]!=='undefined'){
// 		// 	var data = datas[key];
// 		// } else {
// 		// 	var data = config.defaultData !== undefined ? config.defaultData : null;
// 		// }

// 		var data = datas[key] || config.defaultData || null;

// 		// grab local storage data if available
// 		if(config.useLocalStorage){
// 			var ls = window.localStorage.getItem(key);
// 			if(ls!==null && ls!=='undefined'){
// 				try {
// 					data = $.parseJSON(ls);
// 				} catch(errr){
// 					if(debug) console.error(key,'localstorage failed json parse',data,ls);
// 				}
// 			}
// 		}

// 		if(config.process && $.isFunction(config.process)){
// 			try {
// 				data = config.process(data);
// 			} catch(err) {
// 				if(debug) console.error('Snap.setDataConfig() config.process',key);
// 			}
// 		}
// 		if(data){
// 			setData(key,data);
// 		}
// 	}

// 	function flushLocalStorage(key){
// 		window.localStorage.removeItem(key);
// 	}

// 	function getDataConfig(key){
// 		return dataConfig[key] || {
// 			defaultData:'',
// 			useLocalStorage:false,
// 			process:false,
// 			changeIndex:0
// 		};
// 	}

// 	function getData(key){
// 		if(debug>1) console.log('Snap.getData()',key);
// 		var data = null;
// 		if(key in datas){//datas[key]){
// 			data = datas[key];
// 		} else {
// 			var config = dataConfig[key];
// 			if(config && config.defaultData){
// 				data = config.defaultData;
// 			}
// 		}
// 		// this should clone so the object is immutable
// 		// clone function doesn't work on object that has back references
// 		// try {
// 		// 	data = $.extend(true,{},data)
// 		// } catch(err){
// 		// 	console.warn('Snap.getData()',key,'object can not be cloned')
// 		// }
// 		return data;
// 	}

// 	function getElementDataKey(el){
// 		var config = getElementConfig(el);
// 		return config ? config.dataKey : null;
// 	}

// 	function setData(key, data, options){

// 		if(key instanceof jQuery || (key && key.tagName)){
// 			key = getElementDataKey(key);
// 		}
// 		if(debug) console.log('Snap.setData()',key);//,data);if(debug>0) 
// 		// init config if not set
// 		if(!dataConfig[key]){
// 			dataConfig[key] = {changed:true};
// 		}
// 		var config = dataConfig[key];
// 		config.changeIndex++;

// 		options = $.extend({overwrite:false, triggerChange:true},options || {});
// 		var update = data;
// 		var currentData = getData(key);

// 		if($.isFunction(data)){
// 			update = data(currentData);
// 		} else {
// 			if(datas[key] && options.overwrite!==true){
// 				switch($.type(datas[key])){
// 					case 'array' :
// 						if($.type(data)==='array'){
// 							// needs to support update id
// 						}
// 						update = data;
// 						break;
// 					case 'object' :
// 						if(options.deep===true){
// 							update = $.extend(true,{},currentData,data);
// 						} else {
// 							update = $.extend({},currentData,data);
// 						}
// 						break;
// 					case 'string' :
// 					case 'number' :
// 					default :
// 						update = data;
// 				}
// 			} else {
// 				update = data;
// 			}
// 		}
// 		// run process if specified
// 		if(config.process){
// 			try {
// 				update = config.process(update,currentData);
// 			} catch(err) {
// 				if(debug) console.error('Snap.setData() config.process',key);
// 			}
// 		}
// 		if(processors[key]){
// 			//var i = processors[key].length;
// 			for(var i=0; i<processors[key].length; i++){
// 			//while(i--){
// 				update = processors[key][i](update,currentData);
// 			}
// 		}
// 		//if(debug) console.log('--> ','update',update);
// 		// commit data
// 		datas[key] = update;

// 		// save to local storage if config.useLocalStorage === true
// 		if(config.useLocalStorage){
// 			window.localStorage.setItem(key, JSON.stringify(update));
// 		}

// 		if(options.triggerChange!==false){
// 			dispatchChange(key);
// 		}
// 	}

// 	function addProcess(key, func){
// 		if(!processors[key]){
// 			processors[key] = [];
// 		}
// 		processors[key].push(func);
// 	}

// 	function nextRequest(){
// 		if(requestStatus>0) return;
// 		requestStatus = 1;
// 		var entry = requestQueue.pop();
// 		if(!entry.dataType){
// 			entry.dataType = 'json';
// 		}
// 		if(debug>0) console.log('Snap.request()',entry);
// 		$.ajax(entry).done(function(data){
// 			if(this.process){
// 				data = this.process(data);
// 			}
// 			if(this.dataKey){
// 				setData(this.dataKey,data);
// 			}
// 			if(this.callback){
// 				this.callback(data);
// 			}
// 			requestStatus = 0;
// 			if(requestQueue.length) nextRequest();
// 		})
// 	}

// 	function request(info){
// 		requestQueue.push(info);
// 		nextRequest();
// 	}

// 	function setDebug(active){
// 		debug = $.isNumeric(active) ? active : active ? 1 : 0;
// 	}

// 	return {
// 		audit:audit,
// 		request:request,
// 		setController:setController,
// 		getController:getController,
// 		getControlInstance:getControlInstance,
// 		render:render,
// 		getElementConfig:getElementConfig,
// 		getElementController:getElementController,
// 		setTemplate:setTemplate,
// 		getTemplate:getTemplate,
// 		watchData:watchData,
// 		dispatchChange:dispatchChange,
// 		getData:getData,
// 		setData:setData,
// 		setDataConfig:setDataConfig,
// 		getDataConfig:getDataConfig,
// 		setDebug:setDebug,
// 		addProcess:addProcess,
// 		getElementDataKey:getElementDataKey,
// 		getWatchers:function(){
// 			return watchers;
// 		},
// 		flushLocalStorage:flushLocalStorage
// 	}

// })();