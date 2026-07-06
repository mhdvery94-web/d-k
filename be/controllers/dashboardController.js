const prisma = require('../utils/prisma');

class DashboardController {
  async getStats(req, res) {
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get this week's date range
      const thisWeek = new Date(today);
      thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());

      // Get this month's date range
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Parallel queries for performance
      const [
        todayOrders,
        todayRevenue,
        weekOrders,
        weekRevenue,
        monthOrders,
        monthRevenue,
        totalOrders,
        totalRevenue,
        pendingOrders,
        preparingOrders,
        deliveringOrders,
        completedOrders,
        popularMenus,
        recentOrders,
        lowStockMenus,
        totalCustomers,
      ] = await Promise.all([
        // Today's orders count
        prisma.order.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),

        // Today's revenue
        prisma.order.aggregate({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
            paymentStatus: 'paid',
          },
          _sum: {
            total: true,
          },
        }),

        // This week's orders count
        prisma.order.count({
          where: {
            createdAt: {
              gte: thisWeek,
              lt: tomorrow,
            },
          },
        }),

        // This week's revenue
        prisma.order.aggregate({
          where: {
            createdAt: {
              gte: thisWeek,
              lt: tomorrow,
            },
            paymentStatus: 'paid',
          },
          _sum: {
            total: true,
          },
        }),

        // This month's orders count
        prisma.order.count({
          where: {
            createdAt: {
              gte: thisMonth,
              lt: tomorrow,
            },
          },
        }),

        // This month's revenue
        prisma.order.aggregate({
          where: {
            createdAt: {
              gte: thisMonth,
              lt: tomorrow,
            },
            paymentStatus: 'paid',
          },
          _sum: {
            total: true,
          },
        }),

        // Total orders all time
        prisma.order.count(),

        // Total revenue all time
        prisma.order.aggregate({
          where: {
            paymentStatus: 'paid',
          },
          _sum: {
            total: true,
          },
        }),

        // Pending orders (confirmed status)
        prisma.order.count({
          where: {
            orderStatus: 'confirmed',
          },
        }),

        // Preparing orders
        prisma.order.count({
          where: {
            orderStatus: 'preparing',
          },
        }),

        // Delivering orders
        prisma.order.count({
          where: {
            orderStatus: 'delivering',
          },
        }),

        // Completed orders today
        prisma.order.count({
          where: {
            orderStatus: 'completed',
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),

        // Popular menus (top 5 by quantity sold)
        prisma.orderItem.groupBy({
          by: ['menuId', 'menuName'],
          where: {
            order: {
              paymentStatus: 'paid',
            },
          },
          _sum: {
            quantity: true,
          },
          orderBy: {
            _sum: {
              quantity: 'desc',
            },
          },
          take: 5,
        }),

        // Recent orders (last 10)
        prisma.order.findMany({
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            items: {
              select: {
                quantity: true,
              },
            },
          },
        }),

        // Low stock menus (stock < 10)
        prisma.menu.findMany({
          where: {
            stock: {
              lt: 10,
            },
            isActive: true,
          },
          orderBy: {
            stock: 'asc',
          },
          take: 5,
        }),

        // Total unique customers
        prisma.order.groupBy({
          by: ['customerPhone'],
          _count: {
            customerPhone: true,
          },
        }),
      ]);

      // Calculate average order value
      const avgOrderValue = totalOrders > 0 ? Number(totalRevenue._sum.total || 0) / totalOrders : 0;

      // Format response
      const stats = {
        today: {
          orders: todayOrders,
          revenue: Number(todayRevenue._sum.total || 0),
        },
        week: {
          orders: weekOrders,
          revenue: Number(weekRevenue._sum.total || 0),
        },
        month: {
          orders: monthOrders,
          revenue: Number(monthRevenue._sum.total || 0),
        },
        total: {
          orders: totalOrders,
          revenue: Number(totalRevenue._sum.total || 0),
          avgOrderValue: Math.round(avgOrderValue),
          customers: totalCustomers.length,
        },
        status: {
          pending: pendingOrders,
          preparing: preparingOrders,
          delivering: deliveringOrders,
          completedToday: completedOrders,
        },
        popularMenus: popularMenus.map((item) => ({
          id: item.menuId,
          name: item.menuName,
          quantity: item._sum.quantity,
        })),
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: Number(order.total),
          status: order.orderStatus,
          paymentStatus: order.paymentStatus,
          itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
          createdAt: order.createdAt,
        })),
        lowStockMenus: lowStockMenus.map((menu) => ({
          id: menu.id,
          name: menu.name,
          stock: menu.stock,
        })),
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil statistik dashboard',
      });
    }
  }
}

module.exports = new DashboardController();
