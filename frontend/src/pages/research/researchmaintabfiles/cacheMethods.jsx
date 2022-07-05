export function writeToCache(url, data) {  
	sessionStorage.setItem(url, JSON.stringify(data)) 
}

export function writeDataToCache(url, data) {
    var original_data = readFromCache("heron_data")
    if (original_data === null) { 
		sessionStorage.setItem("heron_data", JSON.stringify(new Object({ url: data }))) 
	} else {
      original_data[url] = data
      sessionStorage.setItem("heron_data", JSON.stringify(original_data))
    }
}

export function readDataFromCache(url) {
    try { 
		return JSON.parse(sessionStorage.getItem('heron_data'))[url] 
	} catch { 
		console.log("Unable to read data.")
		return null 
	}
}

export function readFromCache(url) { 
	return JSON.parse(sessionStorage.getItem(url)) 
}

export function writeGraphDataToCache(key, data) {
	var original_data = readFromCache("graph_data")
	if (original_data === null) { 
		var newData = {};
		newData[key] = data	
		sessionStorage.setItem("graph_data", JSON.stringify(newData)) 
	} else {
	  original_data[key] = data
	  sessionStorage.setItem("graph_data", JSON.stringify(original_data))
	}
}

export function readGraphDataFromCache(key) {
	try { 
		return JSON.parse(sessionStorage.getItem('graph_data'))[key] 
	} catch { 
		return null 
	}
}
