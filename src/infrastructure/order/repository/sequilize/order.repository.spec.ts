import { Sequelize } from "sequelize-typescript";
import Order from "../../../../domain/checkout/entity/order";
import OrderItem from "../../../../domain/checkout/entity/order_item";
import Customer from "../../../../domain/customer/entity/customer";
import Address from "../../../../domain/customer/value-object/address";
import Product from "../../../../domain/product/entity/product";
import CustomerModel from "../../../customer/repository/sequelize/customer.model";
import CustomerRepository from "../../../customer/repository/sequelize/customer.repository";
import ProductModel from "../../../product/repository/sequelize/product.model";
import ProductRepository from "../../../product/repository/sequelize/product.repository";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";
import OrderRepository from "./order.repository";

describe("Order repository test", () => {
  let sequelize: Sequelize;

  beforeEach(async () => {
    sequelize = new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
      sync: { force: true },
    });

    await sequelize.addModels([
      CustomerModel,
      OrderModel,
      OrderItemModel,
      ProductModel,
    ]);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it("should create a new order", async () => {
    const customerRepository = new CustomerRepository();
    const customer = new Customer("123", "Customer 1");
    const address = new Address("Street 1", 1, "Zipcode 1", "City 1");
    customer.changeAddress(address);
    await customerRepository.create(customer);

    const productRepository = new ProductRepository();
    const product = new Product("123", "Product 1", 10);
    await productRepository.create(product);

    const orderItem = new OrderItem(
      "1",
      product.name,
      product.price,
      product.id,
      2
    );

    const order = new Order("123", "123", [orderItem]);

    const orderRepository = new OrderRepository();
    await orderRepository.create(order);

    const orderModel = await OrderModel.findOne({
      where: { id: order.id },
      include: ["items"],
    });

    expect(orderModel.toJSON()).toStrictEqual({
      id: "123",
      customer_id: "123",
      total: order.total(),
      items: [
        {
          id: orderItem.id,
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
          order_id: "123",
          product_id: "123",
        },
      ],
    });
  });

  it("should update an existing order", async () => {
  
    const customerRepository = new CustomerRepository();
    const customer = new Customer("123", "Customer 1");
    const address = new Address("Street 1", 1, "Zipcode 1", "City 1");
    customer.changeAddress(address);
    await customerRepository.create(customer);
  
    const productRepository = new ProductRepository();
    const product = new Product("123", "Product 1", 10);
    await productRepository.create(product);
  
    const orderItem = new OrderItem("1", product.name, product.price, product.id, 2);
    const order = new Order("123", "123", [orderItem]);
    const orderRepository = new OrderRepository();
    await orderRepository.create(order);
  
    const updatedProduct = new Product("124", "Product 2", 15);
    await productRepository.create(updatedProduct);
    const updatedOrderItem = new OrderItem("2", updatedProduct.name, updatedProduct.price, updatedProduct.id, 1);
    const updatedOrder = new Order(order.id, order.customerId, [updatedOrderItem]);

    await orderRepository.update(updatedOrder);

    const updatedOrderModel = await OrderModel.findOne({
      where: { id: updatedOrder.id },
      include: ["items"],
    });
  
    expect(updatedOrderModel.toJSON()).toMatchObject({
      id: updatedOrder.id,
      total: updatedOrder.total(),
      items: [
        {
          id: updatedOrderItem.id,
          name: updatedOrderItem.name,
          price: updatedOrderItem.price,
          quantity: updatedOrderItem.quantity,
          order_id: updatedOrder.id,
          product_id: updatedOrderItem.productId,
        }
      ]
    });    
  });
  
  it("should find an order", async () => {
    const customerRepository = new CustomerRepository();
    const productRepository = new ProductRepository();
    const orderRepository = new OrderRepository();

    const customer = new Customer("123", "Customer 1");
    const address = new Address("Street 1", 1, "Zipcode 1", "City 1");
    customer.Address = address;
    await customerRepository.create(customer);

    const product = new Product("321", "Product 1", 100);
    await productRepository.create(product);

    const orderItem = new OrderItem("789", product.name, product.price, product.id, 2);
    const order = new Order("456", customer.id, [orderItem]);
    await orderRepository.create(order);

    const foundOrder = await orderRepository.find(order.id);

    const expectedOrderDetails = {
      id: order.id,
      customerId: customer.id,
      total: order.total(),
      items: [
        {
          id: orderItem.id,
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
          productId: orderItem.productId
        }
      ]
    };

    const foundOrderDetails = {
      id: foundOrder.id,
      customerId: foundOrder.customerId,
      total: foundOrder.total(),
      items: foundOrder.items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        productId: item.productId
      }))
    };

    expect(foundOrderDetails).toEqual(expectedOrderDetails);
  });

  it("should find all orders", async () => {
    const customerRepository = new CustomerRepository();
    const productRepository = new ProductRepository();
    const orderRepository = new OrderRepository();
  
    const customer = new Customer("123", "Customer 1");
    const address = new Address("Street 1", 1, "Zipcode 1", "City 1");
    customer.changeAddress(address);
    await customerRepository.create(customer);
  
    const product1 = new Product("321", "Product 1", 100);
    const product2 = new Product("654", "Product 2", 150);
    await productRepository.create(product1);
    await productRepository.create(product2);
  
    const orderItem1 = new OrderItem("1", product1.name, product1.price, product1.id, 2);
    const order1 = new Order("456", customer.id, [orderItem1]);
    await orderRepository.create(order1);
  
    const orderItem2 = new OrderItem("2", product2.name, product2.price, product2.id, 1);
    const order2 = new Order("789", customer.id, [orderItem2]);
    await orderRepository.create(order2);
  
    const orders = await orderRepository.findAll();
  
    expect(orders).toHaveLength(2);

    const orderIds = orders.map(order => order.id);
    expect(orderIds).toEqual(expect.arrayContaining([order1.id, order2.id]));
    
    const orderTotals = orders.reduce((acc, order) => ({
      ...acc,
      [order.id]: order.total()
    }), {});
    
    expect(orderTotals).toEqual({
      [order1.id]: order1.total(),
      [order2.id]: order2.total()
    });
  });
});
