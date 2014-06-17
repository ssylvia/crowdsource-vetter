define(["storymaps/utils/MovableGraphic","esri/layers/FeatureLayer","dojo/_base/array","esri/arcgis/utils","esri/arcgis/Portal","esri/map","esri/tasks/query","esri/tasks/QueryTask","lib/jquery/jquery-1.10.2.min"],
	function(MoveableGraphic,FeatureLayer,array,arcgisUtils,arcgisPortal,Map,Query,QueryTask){

		/**
		* Core
		* @class Core
		*
		* Main class for story map application
		*
		* Dependencies: Jquery 1.10.2
		*/

		var _portal = new arcgisPortal.Portal("http://www.arcgis.com"),
		_storyLayer = new FeatureLayer(configOptions.featureService);

		function init ()
		{
			login();
		}

		function login()
		{
			_portal.signIn().then(function(){
				var load = false;
				array.forEach(esri.id.credentials,function(user){
					if($.inArray(user.userId,configOptions.authorizedEditors) >= 0){
						load = true;
					}
				});

				if (load){
					esri.id.getCredential(_storyLayer.url);
					addFormEvents();
				}
				else{
					alert("You do not have permission to edit the World of Story Maps App.");
					location.reload();
				}
			});
		}

		function addFormEvents()
		{
			$("#item-search").click(function(){
				queryItem(getItemId($("#form-item").val()));
			});

			$("#item-search-submit").click(function(){
				searchItems($("#form-item-search").val());
			});

			$("#form-item-search").keypress(function(event){
				if(event.which === 13){
					searchItems($("#form-item-search").val());
				}
			});

			$("#item-edit").click(function(){
				editApplicaton();
			});

			$("#item-error-close").click(function(){
				$("#item-error").hide();
			});

			searchItems();
		}

		function getItemId(str)
		{
			if (str.length === 32){
				return str;
			}
			else{
				var index = (str.search("id=") + 3);
				var newStr = str.slice(index,(index + 32));

				return newStr;
			}
		}

		function searchItems(str)
		{
			$(".search-message").show();
			var query = new Query();
			query.outFields = ["*"];
			query.returnGeometry = true;
			if (str){
				var searchStr = str.replace("'","''");
				query.where = "Tweet_ID LIKE '%" + searchStr + "%' OR Text LIKE '%" + searchStr + "%' OR FID LIKE '%" + searchStr + "%'";
			}
			else{
				query.where = "Vetted = 'U'";
			}

			var queryTask = new QueryTask(_storyLayer.url);
			queryTask.execute(query,function(result){			

				$(".results tbody").empty();

				array.forEach(result.features,function(ftr){
					$(".results tbody").append('\
						<tr>\
							<td>' + ftr.attributes.Text + '</td>\
							<td class="approve-tweet align-center"><span class="approve-yes approve-btn btn' + getActiveState(ftr,'approveYes') + '">Yes</span><span class="approve-no approve-btn btn' + getActiveState(ftr,'approveNo') + '">No</span></td>\
							<td class="hide-tweet align-center"><span class="hide-btn btn' + getActiveState(ftr,'hide') + '">Hide</span></td>\
						</tr>\
					');

					$(".results tbody tr").last().data('ftr',ftr);

				});

				$('.approve-btn').click(function(){
					var graphic = $(this).parents('tr').data('ftr').attributes;
					$(this).parents('tr').addClass('data-changed');
					$(this).toggleClass('active');
					$(this).siblings('.approve-btn').removeClass('active');
					if ($(this).hasClass('active') && $(this).hasClass('approve-yes')){
						graphic.Vetted = 'T';
					}
					else if ($(this).hasClass('active') && $(this).hasClass('approve-no')){
						graphic.Vetted = 'F';
					}
					else{
						graphic.Vetted = 'U';
					}
				});

				$('.hide-btn').click(function(){
					$(this).toggleClass('active');
					var graphic = $(this).parents('tr').data('ftr').attributes;
					$(this).parents('tr').addClass('data-changed');
					if ($(this).hasClass('active')){
						graphic.Hide = '1';
					}
					else{
						graphic.Hide = '0';
					}
				});

				$(".results").show();
				$(".search-message").hide();
			});
		}

		function queryItem(item)
		{
			$(".search-message").show();
			arcgisUtils.getItem(item).then(function(result){
				$(".search-message").hide();
				var item = result.item;
				if (item.type === "Web Mapping Application"){
					var thumbnail = "http://www.arcgis.com/sharing/rest/content/items/" + item.id + "/info/" + item.thumbnail;
					$("#item-error").hide();
					$("#form-name").val(item.title);
					$("#form-description").val(item.snippet);
					$("#form-publisher").val(item.owner);
					$("#form-url").val(item.url);
					$("#form-thumbnail").val(thumbnail);
					$("#thumbnail-preview").attr("src",thumbnail);
				}
				else{
					$("#item-error").show();
				}
			},function(){
				$("#item-error").show();
			});
		}

		function getActiveState(ftr,item)
		{
			if (item === 'approveYes' && ftr.attributes.Vetted === 'T'){
				return ' active';
			}
			else if (item === 'approveNo' && ftr.attributes.Vetted === 'F'){
				return ' active';
			}
			else if (item === 'hide' && ftr.attributes.Hide === '1'){
				return ' active';
			}
			else{
				return '';
			}
		}

		function editApplicaton()
		{
			var features = [];

			$('.data-changed').each(function(){
				var ftr = $(this).data('ftr');
				features.push(ftr);
			});

			_storyLayer.applyEdits(null,features).then(function(result){
				var error = false;
				array.forEach(result,function(r){
					if (!r.success){
						error = true;
						console.log(r.error);
					}
				});
				if(error){
					$(".edit-message").hide();
					$(".edit-message.error").show();
				}
				else{
					$(".edit-message").hide();
					$(".edit-message.success").show();
				}
			},function(){
				$(".edit-message").hide();
				$(".edit-message.error").show();
			});
		}

		return {
			init: init
		};
});