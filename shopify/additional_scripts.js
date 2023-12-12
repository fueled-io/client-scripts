<script>
  const dataLayer = window.dataLayer || [];
  if (!window.dataLayer) {
    window.dataLayer = dataLayer;
  }

  dataLayer['fueled'] = {};
  {% if customer %}
    dataLayer['fueled']['customer'] = {};
    {% if customer.orders_count > 0 %}
        dataLayer['fueled']['customer']['total_spent'] = {{ customer.total_spent | divided_by: 100.0 }};
        dataLayer['fueled']['customer']['orders_count'] = {{ customer.orders_count }};
    {% endif %}
  {% endif %}

</script>