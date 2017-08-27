var ObjectFilter = (function(){

	function NOW(){
		return new Date()
	}

	function EOD(d){
		d = d || NOW();
		d.setHours(23,59,59,999);
		return d;
	}

	function BOD(d){
		d = d || NOW();
		d.setHours(0,0,0,0);
		return d;
	}

	function get(data,query){
		if($.type(query)==='string'){
			try {
				query = JSON.parse(query)
			} catch(err) {
				query = {}
			}
		}
		if($.isPlainObject(query)===true){
			query = filterToFunction(query)
		}
		if($.isFunction(query)===true){
			return $.grep(data,query)
		}
		return null
	}

	function arrayHas(arr1,arr2,oper){
		var i,ii;
		var _arr1 = $.type(arr1)!='array' ? [arr1] : arr1;
		var _arr2 = $.type(arr2)!='array' ? [arr2] : arr2;
		found = 0;
		for(i=0; i<_arr2.length; i++){
			for(ii=0; ii<_arr1.length; ii++){
				if(String(_arr1[ii])==String(_arr2[i])){
					found++;
					break;
				}
			}
			if(found==_arr2.length){
				return true;
			}
		}
		return oper=='OR' ? found>0 : found==_arr2.length;
	}

	function dig(data,query){
		console.log('dig','data',data,'query',query)
		var q,d,k

		if($.isArray(data)){
			console.log('--> found array')
			return $.grep(data,function(e){
				dig(e, query)
			})
		}

		if($.isPlainObject(data) && $.isPlainObject(query)){
			for(q in query){
				if(q in data){
					console.log('--> found inner')
					return dig(data[q], query[q])
				}
			}

			// test individual object
			console.log('--> dig test','data',data,'query',query)
			for(q in query){
				switch(q) {
					case '!=' :
					case '!==' :
					case '===' :
					case '>' :
					case '<' :
					case '==' :
					case '>=' :
					case '<=' :
						// var check = eval('e[p] '+pp+' query[p][pp]');
						// if(!check){
						// 	passed = false;
						// 	break;
						// }
						break;
					case 'LIKE' :
						//passed = String(e[p]).match(new RegExp(String(query[p][pp]),'i'));
						//passed = String(e[p]).toLowerCase().indexOf(String(query[p][pp]).toLowerCase())>-1;
						break;
				}
			}
			if(Math.random()<.5){
				return data
			} else {
				return null
			}
		}
		

		return data
	}

	var testData = {
		entries:[
			{id:1, name:'one'},
			{id:2, name:'two'},
			{id:3, name:'three'}
		]
	}

	// entries.WHERE(id>1).AND(name CONTAINS )

	var testQuery = {
		"entries":{
			"FILTER":{
				"TEST":"{{id}}>=2",
				"KEY":"id",
				"IS":">=",
				"VALUE":2,
				"id":{
					"AND":{
						">=":2, 
						"name":{
							"LIKE":"th"
						}
					}
				}
			}
		}
	}

	//var testResult = dig(testData,testQuery)

	//console.log('testResult',testResult)

	function filterToFunction(query){
		var i,ii,p,pp,passed;
		// default function returns all
		var self = {
			primaryKey:'entry_id'
		};
		var test = function(e){
			e.___passed = true;
			return true;
		};
		if($.type(query)=='undefined'){
			return test;
		}
        var shorthand = {
            NOW:NOW(),
			TODAY:NOW(),
			EOD:EOD(),
			BOD:BOD()
        };
		shorthand.TODAY.setHours(23,59,59,999); // ceil date

		// var arrayHas = function(arr1,arr2,oper){
		// 	var i,ii;
		// 	var _arr1 = $.type(arr1)!='array' ? [arr1] : arr1;
		// 	var _arr2 = $.type(arr2)!='array' ? [arr2] : arr2;
		// 	found = 0;
		// 	for(i=0; i<_arr2.length; i++){
		// 		for(ii=0; ii<_arr1.length; ii++){
		// 			if(String(_arr1[ii])==String(_arr2[i])){
		// 				found++;
		// 				break;
		// 			}
		// 		}
		// 		if(found==_arr2.length){
		// 			return true;
		// 		}
		// 	}
		// 	return oper=='OR' ? found>0 : found==_arr2.length;
		// };

		switch($.type(query)){
			case 'number' :
			case 'string' :
				if(query=='*'){
					// return all
					return test;
				} else {
					// assume query is the primary key
					test = function(e){
						passed = e[self.primaryKey]==query;
						e.___passed = true;
						return passed;
					};
				}
				break;
			case 'object' :
				// compare all values in object
				test = function(e)
				{
					passed = true;

					// assume "p" is a field to search
					for(p in query)
					{
						switch($.type(query[p]))
						{
							case 'array' :
								// compare array of values
								passed = false;
								for(i=0; i<query[p].length; i++){
									// check an array against an array
									if($.type(e[p])=='array'){
										// compare against array
										passed = false;
										for(ii=0; ii<e[p].length; ii++){
											if(String(query[p][i])==String(e[p][ii])){
												passed = true;
												break;
											}
										}
										if(passed) break;
									} else {
										if(e[p]==query[p][i]){
											passed = true;
											break;
										}
									}
								}
								break;

							// query is an object
							case 'object' :

								for(pp in query[p])
								{
									// check for shorthand reference
									if(shorthand[query[p][pp]]) query[p][pp] = shorthand[query[p][pp]];

									if($.type(query[p][pp])=='array'){
										switch(pp) {
											case '!=' :
											case '!==' :
												passed = true;
												for(i=0; i<query[p][pp].length; i++){
													if(String(e[p])==String(query[p][pp][i])){
														passed = false;
														break;
													}
												}
												break;
											case '==' :
											case '===' :
												passed = false;
												for(i=0; i<query[p][pp].length; i++){
													if(String(e[p])==String(query[p][pp][i])){
														passed = true;
														break;
													}
												}
												break;

											case 'AND' :
												passed = arrayHas(e[p],query[p][pp],'AND');
												break;

											case 'OR' :
												passed = arrayHas(e[p],query[p][pp],'OR');
												break;
										}
									} else {

										switch(pp) {
											case '!=' :
											case '!==' :
											case '===' :
											case '>' :
											case '<' :
											case '==' :
											case '>=' :
											case '<=' :
												var check = eval('e[p] '+pp+' query[p][pp]');
												if(!check){
													passed = false;
													break;
												}
												break;
											case 'LIKE' :
												//passed = String(e[p]).match(new RegExp(String(query[p][pp]),'i'));
												passed = String(e[p]).toLowerCase().indexOf(String(query[p][pp]).toLowerCase())>-1;
												break;
										}
									}
								}
								break;
							// query equality
							case 'string' :
								if($.type(e[p])=='array'){
									// compare against array
									passed = false;
									for(ii=0; ii<e[p].length; ii++){
										if(String(query[p])==String(e[p])){
											passed = true;
											break;
										}
									}
								} else {
									if(!(p in e) || String(e[p])!=query[p]){
										passed = false;
									}
								}
								break;
							//case 'number' :
							//case 'date' :
							default :
								if($.type(e[p])=='array'){
									// compare against array
									passed = false;
									for(ii=0; ii<e[p].length; ii++){
										if(String(query[p])==String(e[p][ii])){
											passed = true;
											break;
										}
									}
								} else {
									if(!(p in e) || e[p]!=query[p]){
										passed = false;
									}
								}
						}
						if(!passed){
							break;
						}
					}
					e.___passed = true;
					return passed;
				};
				break;
			case 'function' :
				// custom function
				test = function(e){
					var passed = query(e);
					e.___passed = true;
					return passed;
				};
				break;
		}
		return test;
	}

	return {
		get:get
	}

})()