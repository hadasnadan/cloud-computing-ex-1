// put the current ip here
server_address = '52.39.91.22';

window.onload=function(){

	document.getElementById('fileinput').addEventListener('change', function(){
    	var file = this.files[0];
		var formData = new FormData();
		formData.append('file', file);
		$.ajax({
		    url: 'http://' + server_address + ':8080/images',
		    type: 'POST',
		    data: formData,
		    async: false,
		    cache: false,
		    contentType: false,
		    processData: false,
		    success: function (returndata) {
		    	console.log(returndata);
    		},
			error: function (xhr, ajaxOptions, thrownError) {
                  console.log(xhr.status);
                  console.log(thrownError);
                  console.log(xhr.responseText);
            }
  		});
	}, false);

	loadAllImages("");

	$('#all').click(function() {
		loadAllImages("");
	});

	$('#color').click(function() {
		// valid hex pattern
		var color = $('#color_inp').val();
		var isOk  = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(color);
		if(isOk) {
			loadAllImages('?color=' + color);
		} else alert("not a valid hex");
        });
}

var loadAllImages = function(color) {

	$('main').html("");

	$.getJSON('http://' + server_address + ':8080/images'+color, function(data) {
		var images_str = '';
		var i = 0;
		$.each(data, function(index, img){
    		$.getJSON('http://' + server_address + ':8080/images/' + img._id + '?size=small', function(img_data) {
				i++;
				images_str = '';
				images_str += '<div id="img" style="display:block;min-height:200px; float:left; width: 500px;margin-right:60px"><h3>' + img_data.name + '</h3><section id="img_dis" style="min-height:150px;float:left;width:200px;"><img src="' + img_data.link + '"></section>';
				images_str += '<section id="img_data" style="float:right;width:180px">Creator <input type="text" id="creator' + i + '" value="' + img_data.creator +'"><br>Title <input type="text" id="title' + i + '" value="' + img_data.title + '">';
				images_str += '<br><input type="button" value="Update meta data" id="updateMetadata' + i + '" data-id="' + img_data._id +'">';
				images_str += '<br><input type="button" value="Delete image" id="delete' + i + '" data-id="' + img_data._id +'">';
				images_str += '<br><h4>Replace image</h4><input type="file" id="replace' + i + '" data-id="' + img_data._id +'"></section></div>';
				$('main').append(images_str);
				$('#updateMetadata' + i).click(function() {
					var title = $(this).prev().prev().val();
					var creator = $(this).prev().prev().prev().prev().val();
					var img_id = $(this).attr("data-id");
					$.ajax({
            			url: 'http://' + server_address + ':8080/images/' + img_id + '/metadata',
            			type: 'PUT',
            			data: JSON.stringify({"creator":creator,"title":title}),
            			async: false,
            			cache: false,
            			contentType: "application/json; charset=utf-8",
            			processData: false,
				dataType: "json",
            			success: function (returndata) {
                			console.log(returndata);
            			},
            			error: function (xhr, ajaxOptions, thrownError) {
                  			console.log(xhr.status);
                  			console.log(thrownError);
                  			console.log(xhr.responseText);
            			}
				    });
				});
				$('#delete' + i).click(function() {
                                	var img_id = $(this).attr("data-id");
                                        $.ajax({
                                url: 'http://' + server_address + ':8080/images/' + img_id,
                                type: 'DELETE',
                                async: false,
                                cache: false,
                                processData: false,
                                success: function (returndata) {
                                        console.log(returndata);
                                },
                                error: function (xhr, ajaxOptions, thrownError) {
                                        console.log(xhr.status);
                                        console.log(thrownError);
                                        console.log(xhr.responseText);
                                }
                                    });
                                });
				$('#replace' + i).change(function() {						
					var file = this.files[0];
					var img_id = $(this).attr("data-id");	
                	var formData = new FormData();
                	formData.append('file', file);
                	$.ajax({
                    	url: 'http://' + server_address + ':8080/images/' + img_id,
                    	type: 'PUT',
                    	data: formData,
                    	async: false,
                    	cache: false,
                    	contentType: false,
                    	processData: false,
                    	success: function (returndata) {
                        	console.log(returndata);
                		},
                        error: function (xhr, ajaxOptions, thrownError) {
                  			console.log(xhr.status);
                  			console.log(thrownError);
                  			console.log(xhr.responseText);
            			}
        			});
				
				});	
			});
		});
		$('main').append(images_str);
    });
}

