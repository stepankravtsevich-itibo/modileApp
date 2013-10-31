var SupplyOrderEditItemView = function(item_id){

  this.render = function(){
    var context = {},
        self = this;
    context.userInfo = app.getUserInfo();
    context.version = app.application_build + " " + app.application_version;
    context.order_id = app.activeOrder().id;

    context.item = (function(){
      var return_item = {},
          activeOrder = app.activeOrder().upd;
      $.each(Object.keys(activeOrder.supply_order_categories), function(i,v){
        $.each(Object.keys(activeOrder['supply_order_categories'][v]), function(ik,vk){
          if (item_id == vk){
            return_item = $.extend(activeOrder['supply_order_categories'][v][vk], {category: v});
            return false;
          }
        });
      });
      return return_item;
    })();

    this.el.html(SupplyOrderEditItemView.template(context));
    return this;
  };

  this.initialize = function(){
    var self = this;
    this.el = $('<div/>');

    this.el.on("change", "#item_amount", function(e){
      e.preventDefault();
      $("#total").val((parseFloat($(e.currentTarget).val()) * parseFloat($("#price").val())).toFixed(2));
    });

    this.el.on("click", "button", function(e){
      e.preventDefault();
      var order = app.activeOrder();
      order['upd']['supply_order_categories'][$("#category").text()][$("#item_id").val()]["amount"] =
          ("remove_btn" == $(e.currentTarget).attr("id")) ? 0 : $("#item_amount").val();

      app.activeOrder(order);
      setTimeout(function(){
        app.route({
          toPage: window.location.href + "#order:" + order.id
        });
      }, 0);
    });
  };

  this.initialize();
}

Handlebars.registerHelper("editItemContent", function(item){
  var order = app.activeOrder().upd,
      out = "<div data-role=\"content\">";

  out = out + "<div class=\"location_details\">";
  out = out + "<p><font>"+order.site_name+"</font><br /><em>"+order.site_address+"</em></p>";
  out = out + "<p>Order type: <span>"+order.order_form+"</span>";
  if ("draft" == order.order_status){
    out = out + "<br /><strong>Budget: <span>"+order.remaining_budget+"$</span></strong>";
  }
  out = out + "</p>";
  out = out + "<p>Category: <span id=\"category\">"+item.category+"</span></p>";
  out = out + "</div><br />";

  out = out + "<div class=\"order_item_descr\">";
  out = out + "<input id=\"item_id\" name=\"item_id\" type=\"hidden\" value=\"" + item.item_id + "\" />";
  out = out + "<div data-role=\"fieldcontain\"><label for=\"serial_number\">Serial Number:</label><input id=\"serial_number\" name=\"serial_number\" disabled=\"disabled\" type=\"text\" value=\"" + item.serial_number + "\" /></div>";
  out = out + "<div data-role=\"fieldcontain\"><label for=\"description\">Description:</label><input id=\"description\" name=\"description\" type=\"text\" disabled=\"disabled\" value=\"" + (item.description).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + "\" /></div>";
  out = out + "<div data-role=\"fieldcontain\"><label for=\"measurement\">Measurement:</label><input id=\"measurement\" name=\"measurement\" type=\"text\" disabled=\"disabled\" value=\"" + item.measurement + "\" /></div>";
  out = out + "<div data-role=\"fieldcontain\"><label for=\"price\">Price:</label><input id=\"price\" name=\"price\" type=\"text\" disabled=\"disabled\" value=\"" + item.price + "\" /></div>";
  out = out + "<div data-role=\"fieldcontain\"><label for=\"item_amount\">Amount:</label>";
  out = out + "<input id=\"item_amount\" name=\"item_amount\" type=\"number\"" +
      "value=\""+(("Each" == item.measurement)? parseInt(item.amount):parseFloat(item.amount))+"\""+
      "pattern=\""+(("Each" == item.measurement)? "[0-9]+":"[0-9\.]+[0-9]$")+"\" /></div>";
  out = out + "<div data-role=\"fieldcontain\"><label for=\"total\">Total:</label><input id=\"total\" name=\"total\" type=\"text\" disabled=\"disabled\" value=\""+ (item.amount*item.price).toFixed(2) +"\" /></div>";
  out = out + "</div>";

  out = out + "<div class=\"managment btn2\">";
  out = out + "<div class=\"green_btn box_add\"><button id=\"save_btn\">Save</button></div>";
  out = out + "<div class=\"green_btn box_save\"><button id=\"remove_btn\">Remove</button></div>";
  out = out + "</div>";

  out = out + "</div>";

  return new Handlebars.SafeString(out);
});

SupplyOrderEditItemView.template = Handlebars.compile($("#order-item-tpl").html());


/* ---------------------------------------------------------------------------------------------------------*/

var SupplyOrderAddItemView = function(order_id){
  this.order_id = order_id || false;

  this.render = function(){
    var context = {},
        self = this;
    context.userInfo = app.getUserInfo();
    context.version = app.application_build + " " + app.application_version;
    context.order_id = self.order_id;

    this.el.html(SupplyOrderAddItemView.template(context));
    return this;
  };

  this.initialize = function(){
    var self = this;
    this.el = $('<div/>');

    this.el.on('change', "select#category", function(e){
      var out = "",
          category_out = "";
          chosen = $(e.currentTarget).val(),
          order = app.activeOrder().upd;

      if(chosen.length>0){
        if ("all" == chosen){
          $.each(Object.keys(order.supply_order_categories), function(i,cat_name){
            category_out = "";
            var category = order.supply_order_categories[cat_name];
            $.each(Object.keys(category), function(ik,serial_number){
              if (parseFloat(category[serial_number]["amount"]) == 0){
                var item = category[serial_number];
                category_out = category_out + "<li><a href=\"#editOrderItem:"+serial_number+"\">";
                category_out = category_out + serial_number +"<br/>"+item.description +"<br/>"+item.measurement +"<br/>"+item.price;
                category_out = category_out + "</a></li>";
              }
            });
            if (category_out.length>0){
              out = out + "<ul data-role=\"listview\" data-inset=\"true\"><li data-role=\"list-divider\" role=\"heading\">"+ cat_name +"</li>" + category_out + "</ul>";
            }
          });
        } else {
          category_out = "";
          $.each(Object.keys(order.supply_order_categories[chosen]), function(ik,serial_number){
            var item = order.supply_order_categories[chosen][serial_number];
            if (parseFloat(item.amount) == 0){
              category_out = category_out + "<li><a href=\"#editOrderItem:"+serial_number+"\">";
              category_out = category_out + serial_number +"<br/>"+item.description +"<br/>"+item.measurement +"<br/>"+item.price;
              category_out = category_out + "</a></li>";
            }
          });
          if (category_out.length>0){
            out = out + "<ul data-role=\"listview\" data-inset=\"true\">" + category_out + "</ul>";
          } else {
            out = out + "<ul data-role=\"listview\" data-inset=\"true\"><li>Empty</li></ul>";
          }
        }
        out = out + "</ul>";
      }
        $("#list_items").html(out);
        $("ul", $("#list_items")).listview();
    });
  };

  this.initialize();
}

Handlebars.registerHelper("backButtonItemView", function(id){
  var out;
  if (id === false){
    out = "<a href=\"#orders\" class=\"ui-btn-right\" data-role=\"button\" >Back</a>"
  } else {
    out = "<a href=\"#order:"+id+"\" class=\"ui-btn-right\" data-role=\"button\" >Back</a>"
  }
  return new Handlebars.SafeString(out);
});


Handlebars.registerHelper("addItemContent", function(){
  var order = app.activeOrder().upd,
      out = "<div data-role=\"content\">";

  out = out + "<div class=\"location_details\">";
  out = out + "<p><font>"+order.site_name+"</font><br /><em>"+order.site_address+"</em></p>";
  out = out + "<p>Order type: <span>"+order.order_form+"</span>";
  if ("draft" == order.order_status){
    out = out + "<br /><strong>Budget: <span>"+order.remaining_budget+"$</strong>";
  }
  out = out + "</p></div><br />";

  out = out + "<select name=\"category\" id=\"category\">";
  out = out + "<option value=\"\">- Select Category -</option>";
  $.each(Object.keys(order.supply_order_categories), function( index, value ) {
    out = out + "<option value=\"" + value + "\">" + value + "</option>";
  });
  out = out + "<option value=\"all\">All Categories</option>";
  out = out + "</select>";

  out = out + "<div id=\"list_items\"></div>";

  out = out + "</div>";

  return new Handlebars.SafeString(out);
});

SupplyOrderAddItemView.template = Handlebars.compile($("#add-order-item-tpl").html());