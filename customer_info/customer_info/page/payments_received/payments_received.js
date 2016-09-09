frappe.pages['payments-received'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Payments Received',
		single_column: true
	});
	wrapper.payments_received = new payments_received(wrapper)
	frappe.breadcrumbs.add("Customer Info");
}

payments_received = Class.extend({
	init: function(wrapper) {
		var me = this;
		this.wrapper_page = wrapper.page;
		this.page = $(wrapper).find('.layout-main-section-wrapper');
		this.wrapper = $(wrapper).find('.page-content');
		export_btn: wrapper.page.set_secondary_action(__("Export"),
		function() { 
					me.get_data_export();
				}, "icon-refresh");
		this.set_fields();
		this.render_payments_details();
	},
	set_fields: function() {
		var me = this;
		html = "<div>\
				<div class='col-xs-2 customer'></div>\
				<div class='col-xs-2 from_date'></div>\
  				<div class='col-xs-2 to_date'></div>\
  				<div class='col-xs-6'></div>\
  				</div>\
				<table id='tableSearchResults' class='table table-hover  table-striped table-condensed' style='font-size:12px;margin-bottom: 0px;'>\
			     	<thead>\
			            <tr>\
			                <th width='7%'>Payment Date</th>\
			                <th width='7%'>Customer Name</th>\
			                <th width='7%'>Payment Type</th>\
			                <th width='7%'>Payment Amount</th>\
			                <th width='7%'>Late Fees Amount</th>\
			                <th width='7%'>Receivables Amount</th>\
			                <th width='7%'>Discount Amount</th>\
			                <th width='7%'>Bonus Amount</th>\
			                <th width='12%'>Total Payment Received Amount</th>\
			                <th width='11%'>Bank Transfer Amount</th>\
			                <th width='7%'>Cash Amount</th>\
			                <th width='7%'>Bank Card Amount</th>\
			                <th width='7%'>Refund Payment</th>\
			                <th width='2%'></th>\
			            </tr>\
			        </thead></table>"
		me.page.html(html)
		me.customer_link = frappe.ui.form.make_control({
			parent: me.page.find(".customer"),
			df: {
			fieldtype: "Link",
			options: "Customer",
			fieldname: "customer",
			placeholder: "Select Customer"
			},
			render_input: true
		});
		me.customer_link.refresh();
		me.from_date = frappe.ui.form.make_control({
			parent: me.page.find(".from_date"),
			df: {
				fieldtype: "Date",
				fieldname: "from_date",
				placeholder: "From Date"
			},
			render_input: true
		});
		me.from_date.refresh();
		me.to_date = frappe.ui.form.make_control({
			parent: me.page.find(".to_date"),
			df: {
				fieldtype: "Date",
				fieldname: "to_date",
				placeholder: "To Date"
			},
			render_input: true
		});
		me.to_date.refresh();

		me.customer_link.$input.on("change", function(){
			var old_me = me;
			old_me.render_payments_details()
		});

		me.from_date.$input.on("change", function(){
			var old_me = me;
			old_me.render_payments_details()
		});

		me.to_date.$input.on("change", function(){
			var old_me = me;
			old_me.render_payments_details()
		});
				
	},
	render_payments_details: function() {
		var me = this;
		this.data = ""
		frappe.call({
			method: "customer_info.customer_info.page.payments_received.payments_received.get_payments_details",
			args: {
				"customer": me.customer_link.$input.val(),
				"from_date": me.from_date.$input.val(),
				"to_date":me.to_date.$input.val(),
			},
			freeze: true,
			freeze_message: __("Please Wait..."),
			callback: function(r) {
				console.log(r.message["data"],"r.message")
        	   	me.page.find(".data").empty();
				$.each(r.message["data"], function(i, d) {
					if(d["payoff_cond"]){
						me.payoff_cond = d["payoff_cond"]
					}
					me.payments_ids = d["payments_ids"]
					d["payments_ids"] = me.update_dict_by_payment_ids()
        	   	});
				/*$.each(r.message, function(i, d) {
					me.payments_ids = d["payments_ids"]
					d["payments_ids"] = me.update_dict_by_payment_ids()
        	   	});*/
        	   	me.data = r.message["data"];
        	   	html = frappe.render_template("payments_received",{"data": r.message["data"],"total":r.message["total"]})
				me.page.append(html)
				me.refund();
			}
		})
	},
	update_dict_by_payment_ids:function(){
		var me = this;
		var flt_precision = frappe.defaults.get_default("float_precision")
		var dict_of_payments_ids = []
		var __dict_of_payments_ids = []
		var formatted_list_of_payment_ids = JSON.parse("[" + me.payments_ids.slice(0,-1) + '"' + "]")[0].split(",")
		//console.log(JSON.parse("[" + payments_ids.slice(0,-1) + '"' + "]")[0].split(","),"sssssssssaaaaaa");
		if(me.payoff_cond == "90d SAC" || me.payoff_cond == "Early buy"){
			late_fees = 0
			rental_payment = 0
			total = 0
			payment_id = ""
			payments_ids = []
			$.each(formatted_list_of_payment_ids, function(i, d) {
				payment_id = d.split("/")[0].split("-P")[0],
				payments_ids.push(d.split("/")[0])
				late_fees += parseFloat(flt(me.get_late_fees(d.split("/")[1],d.split("/")[3],d.split("/")[2])).toFixed(2))
				rental_payment += parseFloat(flt(d.split("/")[2]).toFixed(2))
				total += parseFloat(flt(me.get_late_fees(d.split("/")[1],d.split("/")[3],d.split("/")[2]) + flt(d.split("/")[2])).toFixed(2))
	   		});
	   		__dict_of_payments_ids.push({"payments_id":payment_id+"-"+me.payoff_cond,
				"payment_id_list": JSON.stringify(payments_ids.toString()),
				"due_date":"-",
				"rental_payment":rental_payment.toFixed(2),
				"late_fees":late_fees.toFixed(2),
				"total": total.toFixed(2) 
	   		})
			console.log("__dict_of_payments_ids",__dict_of_payments_ids)
			return __dict_of_payments_ids
		}
		else{
			$.each(formatted_list_of_payment_ids, function(i, d) {
		   		dict_of_payments_ids.push({"payments_id":d.split("/")[0],
					"due_date":d.split("/")[1],
					"rental_payment":d.split("/")[2],
					"late_fees":parseFloat(me.get_late_fees(d.split("/")[1],d.split("/")[3],d.split("/")[2])).toFixed(2),
					"total": parseFloat(me.get_late_fees(d.split("/")[1],d.split("/")[3],d.split("/")[2]) + flt(d.split("/")[2])).toFixed(2) 
		   		})
		   	});
			console.log("dict_of_payments_ids",dict_of_payments_ids)
			return dict_of_payments_ids
		}
	},
	get_late_fees : function(date1,date2,rental_payment){
		var date_diff = frappe.datetime.get_diff(date2,date1)
		if(flt(date_diff) > 3){
			return (flt(date_diff) - 3) * rental_payment * 0.02	
		}
		else{
			return 0
		}	
	},
	refund:function(){
		var me = this;		
		$(me.page).find(".refund").click(function() {
			me.ph_name = $(this).attr("ph-name")
			me.show_dialog();
		});
	},
	show_dialog:function(){
		var me = this;
		console.log(me,"me inside show_dialog")
		this.dialog = new frappe.ui.Dialog({
            		title: "Refund Process",
                	fields: [
                   		{"fieldtype": "Select" , "fieldname": "refund" , "label": "Do You Want To Refund","options":["No","Yes"],"default":"No"},
                   		{"fieldtype": "Button" , "fieldname": "refund_payment" , "label": "Refund"}
                   	],
	       		});
       	this.fd = this.dialog.fields_dict;
       	this.dialog.$wrapper.find('.modal-dialog').css("width", "350px");
       	this.dialog.$wrapper.find('.modal-dialog').css("height", "300px");
       	this.dialog.$wrapper.find('.hidden-xs').css("margin-left","-2px");
       	this.dialog.show();
       	me.click_on_refund_inside_dialog();
	},
	click_on_refund_inside_dialog:function(){
		var me = this;
		me.fd.refund_payment.$input.click(function() {
			me.make_refund_payment()
		})	
	},
	make_refund_payment:function(){
		var me = this;
		if(me.fd.refund.$input.val() == "Yes"){
			var id_list = []
			len = $('.'+String(me.ph_name)).length
			if($('.'+String(me.ph_name)).attr("payment-ids")){
				id_list = $('.'+String(me.ph_name)).attr("payment-ids").split(",")
			}
			else{
				for(i=0;i<len;i++){
					id_list.push($($('.'+String(me.ph_name))[i]).text())
				}
			}
			if(id_list.length>0){
				frappe.call({
			        method: "customer_info.customer_info.page.payments_received.payments_received.make_refund_payment",
		           	args: {
		           		"payments_ids":id_list,
		            	"ph_name":me.ph_name
		            },
			       	callback: function(r){
			       		$('tr#'+String(me.ph_name)).hide()
			       		me.dialog.hide();
			       		me.render_payments_details();

			    	}
		    	});
			}
		}
		else{
			me.dialog.hide();
		}
	},
	get_data_export:function(){
		var me = this;
		window.location.href = repl(frappe.request.url +
		'?cmd=%(cmd)s&data=%(data)s', {
			cmd: "customer_info.customer_info.page.payments_received.payments_received.create_csv",
			data:JSON.stringify(me["data"])
		});
	}
});