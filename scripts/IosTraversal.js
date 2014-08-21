

/******* helper function  begin  ***********
*/
function getObjectClassName(obj) {
	if (obj && obj.toString()) {    
    
    	var str = obj.toString();
    
	    /*
	     * executed if the return of object.toString() is 
	     * "[object objectClass]"
	     */
                      
	    if(str.charAt(0) == '['){
	        var arr = str.match(/\[\w+\s*(\w+)\]/);
	    } 
	    else {
	    	/*
	    	 * executed if the return of object.constructor.toString() is 
	    	 * "function objectClass () {}"
	    	 * for IE Firefox
	     	*/
	    	var arr = str.match(/function\s*(\w+)/);
	    }
    
	    if (arr && arr.length == 2) {
	        return arr[1];
	    }
    }
    
    return undefined; 
};


function obj2string(o){
	var r=[];
	if(typeof o=="string"){
		return "\""+o.replace(/([\'\"\\])/g,"\\$1").replace(/(\n)/g,"\\n").replace(/(\r)/g,"\\r").replace(/(\t)/g,"\\t")+"\"";
	}
	if(typeof o=="object"){
		if(!o.sort){
			for(var i in o){
				r.push(obj2string(o[i]));
			}
			if(!/^\n?function\s*toString\(\)\s*\{\n?\s*\[native code\]\n?\s*\}\n?\s*$/.test(o.toString)){
				r.push("toString:"+o.toString.toString());
			}
			r="{"+r.join()+"}\n";
		}else{
			for(var i=0;i<o.length;i++){
				r.push(obj2string(o[i]))
			}
			r="["+r.join()+"]";
		} 
		return r;
	} 
	return o.toString();
}
/******* helper function  end  ***********
*/

/////-----begin------ global dict ---------
var G_Dict = {};

function makeDictKey(obj_type,obj_name,obj_position){
	var key = null;
	var str_position = null;
	str_position = obj_position.origin.x + '_' + obj_position.origin.y;
	str_position += '_' + obj_position.size.width + '_' + obj_position.size.height;

	key = obj_type + '_' + obj_name + '_' + str_position;

	return key;
}

function addDict(obj_type,obj_name,obj_position,level){
	var key = makeDictKey(obj_type,obj_name,obj_position);
	//UIALogger.logDebug(key);
	var value = {};
	value["level"] = level;
	value["status"] = "undo";
	
	if(! G_Dict.hasOwnProperty(key)){
		G_Dict[key] = value;
	}
	//printDict();
}

function seekDict(obj_type,obj_name,obj_position){
	var key = makeDictKey(obj_type,obj_name,obj_position);

	return G_Dict[key];
}

function printDict(){
	var description = "";
	for(var i in G_Dict){
		var property = G_Dict[i];
		description += i + " = " + property["level"] + '_' + property["status"] + ';\n';
	}

	UIALogger.logDebug(description);
}

function setDictElementDone(obj_type,obj_name,obj_position){
	var key = makeDictKey(obj_type,obj_name,obj_position);
	var value = G_Dict[key];
	value["status"] = "done";
}
/////-----end------ global dict ---------

function checkCanBeTapped(element){
	if( !element.isValid() || !element.isEnabled() || !element.isVisible() 
		|| getObjectClassName(element) == "UIAStaticText"){
		UIALogger.logDebug(getObjectClassName(element) + ":" + element.name() + " cannot be tap");
		return false;
	}else{
		return true;
	}
}

//ele_arr :  a array, input and output parament
function getCurrentLayerElements(root,ele_arr){
	if (root instanceof UIAElementNil) {
		UIALogger.logDebug("the root node is null");
		return;
	}
	
	var elements = null;
	
	for (var i = root.length - 1; i >= 0; i--){
	//for (var i = 0; i < root.length; i++){
		//UIALogger.logDebug("in array: [" + i.toString() + "] " + getObjectClassName(root[i]) + " _ " + root[i].name() );

		ele_arr.push(root[i]);
		elements = root[i].elements();
		if (elements instanceof UIAElementNil) {
			//UIALogger.logDebug("get the null node");
			continue;
		}else{
			getCurrentLayerElements(elements,ele_arr);
		}
	};
}

function rmDoneElements(ele_arr,level){
	var new_arr = [];

	var obj_type = null;
	var obj_name = null;
	var obj_position = null;

	for (var i = 0; i <= ele_arr.length - 1; i++) {
		
		//UIALogger.logDebug(i.toString());
		
		var test = ele_arr[i];
		
		//UIALogger.logDebug(test.toString());
		
		if( ele_arr[i] instanceof UIAElementNil) {
			UIALogger.logDebug("null node,not process");
			continue;
		}
		
		obj_name = ele_arr[i].name();
		obj_position = ele_arr[i].rect();
		obj_type = getObjectClassName(ele_arr[i]);

		if(obj_type === undefined){
			UIALogger.logDebug("when rmDoneElements " + obj_name + '_' + obj_position + "type is undefined");
			continue;
		}else{
			if( checkCanBeTapped(ele_arr[i])){
				if(undefined == seekDict(obj_type,obj_name,obj_position)){
					new_arr.push(ele_arr[i]);
					addDict(obj_type,obj_name,obj_position,level);
				}else{
					var value = seekDict(obj_type,obj_name,obj_position);
					if(value["status"] == "undo"){
						new_arr.push(ele_arr[i]);
					}
				}
			}else{
				UIALogger.logDebug(obj_type + ":" + obj_name + " cannot be tapped,so donn't add to G_Dict and rm in current_undo_element_arr" );
			}
		}
	};

	return new_arr;
}

//use events to represent element
function traversalTree(level){

	var elements = window.elements();

	//window.logElementTree();

	var current_all_element_arr = [];
	var current_undo_element_arr = [];
	var navigationbar_arr = [];
	var tabbar_arr = [];

	target.pushTimeout(0);
	getCurrentLayerElements(elements,current_all_element_arr);
	target.popTimeout();
	
	UIALogger.logDebug("current_all_element_arr length: " + current_all_element_arr.length.toString());
	/*for (var i = 0; i < current_all_element_arr.length; i++) {
		UIALogger.logDebug("current_all_element_arr: " + getObjectClassName(current_all_element_arr[i]));
	};*/
	
	current_undo_element_arr = rmDoneElements(current_all_element_arr,level);

	/*for (var i = 0; i < current_undo_element_arr.length; i++) {
		UIALogger.logDebug("current_undo_element_arr: " + getObjectClassName(current_all_element_arr[i]) + ':' +  current_all_element_arr[i].name());
	};*/

	UIALogger.logDebug("current_undo_element_arr length: " + current_undo_element_arr.length.toString());

	if(current_undo_element_arr.length <= 0){
		UIALogger.logDebug("level[" + level.toString() + "]:  " + "current_undo_element_arr is empty.");
		return;
	}
	
	for (var i = 0; i < current_undo_element_arr.length; i++) {
		UIALogger.logDebug( "in for: " + i.toString());
		var obj_name = current_undo_element_arr[i].name();
		var obj_position = current_undo_element_arr[i].rect();
		var obj_type = getObjectClassName(current_undo_element_arr[i])
		if( obj_type === undefined){
			UIALogger.logDebug("level[" + level.toString() + "]:  " + obj_type + " is undefined");
			continue;
		}else{
			var value = seekDict(obj_type,obj_name,obj_position);
			if(value == undefined){
				var key = makeDictKey(obj_type,obj_name,obj_position);
				UIALogger.logDebug("seekDict " + key + " null, amazing...");

				if(checkCanBeTapped(current_undo_element_arr[i])){
					addDict(obj_type,obj_name,obj_position,level);

					UIALogger.logDebug("level[" + level.toString() + "]:  " + "tap " + obj_type + ":" + obj_name);
					/*UIALogger.logDebug("isValid: " + current_undo_element_arr[i].isValid().toString() +
						" isEnabled: " + current_undo_element_arr[i].isEnabled().toString() +
						" isVisible: " + current_undo_element_arr[i].isVisible().toString());
					*/
					current_undo_element_arr[i].tap();
					setDictElementDone(obj_type,obj_name,obj_position);
					traversalTree(level+1);		
				}else{
					continue;
				}		
			}else{
				if(value["status"] == "undo"){
					UIALogger.logDebug(value["level"] + '_' + value["status"]);
					UIALogger.logDebug("level[" + level.toString() + "]:  " + "tap " + obj_type + ":" + obj_name);
					UIALogger.logDebug("isValid: " + current_undo_element_arr[i].isValid().toString() +
						" isEnabled: " + current_undo_element_arr[i].isEnabled().toString() +
						" isVisible: " + current_undo_element_arr[i].isVisible().toString());
					if( !checkCanBeTapped(current_undo_element_arr[i]) ){
						setDictElementDone(obj_type,obj_name,obj_position);
						continue;
					}else{
						try{
							setDictElementDone(obj_type,obj_name,obj_position);
							current_undo_element_arr[i].tap();  //may throw could not be tapped
							traversalTree(level+1);	
						}catch(e){
							UIALogger.logDebug(e.toString());
						}finally{			
							continue;
						}
					}		
				}else{
					UIALogger.logDebug("level[" + level.toString() + "]:  "  + obj_type + ":" + obj_name + " is done, continue for");
					continue;
				}
			}
		}
	};
	
}

/*
var target = UIATarget.localTarget();
var app = target.frontMostApp();
var window = app.mainWindow();

//UIALogger.logDebug(obj2string(window));


//window.logElement();
window.logElementTree();

var tabbar = window.elements()[3];
tabbar.elements()[3].tap();

window.logElementTree();

window.elements()[1].elements()[1].tap();

window.logElementTree();

var current_all_element_arr = [];

target.pushTimeout(0);
getCurrentLayerElements(window.elements(),current_all_element_arr);
target.popTimeout();
	
UIALogger.logDebug("current_all_element_arr length: " + current_all_element_arr.length.toString());
for (var i = 0; i < current_all_element_arr.length; i++) {
	UIALogger.logDebug("current_all_element_arr: " + getObjectClassName(current_all_element_arr[i]));
};

*/
/*
var elements = window.elements();
UIALogger.logDebug(elements.length.toString());

for (var i = 0; i < elements.length; i++) {
	UIALogger.logDebug( getObjectClassName(elements[i]) );
};

//UIALogger.logDebug(obj2string(window));


var current_all_element_arr = [];
current_all_element_arr = window.getChildren();
//getCurrentLayerElements(elements,current_all_element_arr);

UIALogger.logDebug(current_all_element_arr.length.toString());
for (var i = 0; i < current_all_element_arr.length; i++) {
	UIALogger.logDebug( getObjectClassName(current_all_element_arr[i]) );
};
*/

var target = UIATarget.localTarget();
var app = target.frontMostApp();
var window = app.mainWindow();

traversalTree(0);

//printDict();