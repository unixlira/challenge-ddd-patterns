import Order from "../../../../domain/checkout/entity/order";
import OrderItem from "../../../../domain/checkout/entity/order_item";
import OrderRepositoryInterface from "../../../../domain/checkout/repository/order-repository.interface";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";

export default class OrderRepository implements OrderRepositoryInterface {
  async create(entity: Order): Promise<void> {
    await OrderModel.create(
      {
        id: entity.id,
        customer_id: entity.customerId,
        total: entity.total(),
        items: entity.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          product_id: item.productId,
          quantity: item.quantity,
        })),
      },
      {
        include: [{ model: OrderItemModel }],
      }
    );
  }

  async update(entity: Order): Promise<void> {
    await OrderModel.update({
      total: entity.total(),
    }, {
      where: { id: entity.id },
    });

    const existingItems = await OrderItemModel.findAll({
      where: { order_id: entity.id },
    });

    const existingItemsIds = existingItems.map(item => item.id);
    const newItemsIds = entity.items.map(item => item.id);
    const itemsToRemove = existingItemsIds.filter(id => !newItemsIds.includes(id));
    if (itemsToRemove.length > 0) {
      await OrderItemModel.destroy({
        where: { id: itemsToRemove },
      });
    }
    for (const item of entity.items) {
      const data = {
        id: item.id,
        order_id: entity.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
      };

      const existingItem = existingItems.find(i => i.id === item.id);
      if (existingItem) {
        await OrderItemModel.update(data, { where: { id: item.id } });
      } else {
        await OrderItemModel.create(data);
      }
    }
  }

  async find(id: string): Promise<Order> {
    const orderModel = await OrderModel.findOne({
      where: { id },
      include: [OrderItemModel]
    });

    if (!orderModel) {
      throw new Error("Order not found");
    }

    const items = orderModel.items.map(item => new OrderItem(item.id, item.name, item.price, item.product_id, item.quantity ));
    const order = new Order(orderModel.id, orderModel.customer_id, items);

    return order;
  }

  async findAll(): Promise<Order[]> {
    const orderModels = await OrderModel.findAll({
      include: [OrderItemModel]
    });

    const orders = orderModels.map(model => {
      const items = model.items.map(item => new OrderItem(item.id, item.name, item.price, item.product_id, item.quantity ));
      return new Order(model.id, model.customer_id, items);
    });

    return orders;
  }
}
