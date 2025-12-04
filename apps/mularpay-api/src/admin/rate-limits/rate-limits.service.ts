import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RateLimitsService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      total24h,
      totalToday,
      uniqueIPs,
      uniqueUsers,
      topEndpoint,
      topCountry,
    ] = await Promise.all([
      // Total violations in last 24 hours
      this.prisma.rateLimitViolation.count({
        where: {
          violatedAt: {
            gte: yesterday,
          },
        },
      }),

      // Total violations today
      this.prisma.rateLimitViolation.count({
        where: {
          violatedAt: {
            gte: today,
          },
        },
      }),

      // Unique IPs in last 24 hours
      this.prisma.rateLimitViolation.findMany({
        where: {
          violatedAt: {
            gte: yesterday,
          },
        },
        distinct: ['ip'],
        select: { ip: true },
      }),

      // Unique users in last 24 hours
      this.prisma.rateLimitViolation.findMany({
        where: {
          violatedAt: {
            gte: yesterday,
          },
          userId: {
            not: null,
          },
        },
        distinct: ['userId'],
        select: { userId: true },
      }),

      // Most targeted endpoint
      this.prisma.rateLimitViolation.groupBy({
        by: ['endpoint'],
        where: {
          violatedAt: {
            gte: yesterday,
          },
        },
        _count: {
          endpoint: true,
        },
        orderBy: {
          _count: {
            endpoint: 'desc',
          },
        },
        take: 1,
      }),

      // Top source country
      this.prisma.rateLimitViolation.groupBy({
        by: ['country'],
        where: {
          violatedAt: {
            gte: yesterday,
          },
          country: {
            not: null,
          },
        },
        _count: {
          country: true,
        },
        orderBy: {
          _count: {
            country: 'desc',
          },
        },
        take: 1,
      }),
    ]);

    return {
      total24h,
      totalToday,
      uniqueIPs: uniqueIPs.length,
      uniqueUsers: uniqueUsers.length,
      topEndpoint: topEndpoint[0]?.endpoint || null,
      topCountry: topCountry[0]?.country || null,
    };
  }

  async getViolations(params: {
    page: number;
    limit: number;
    endpoint?: string;
    country?: string;
    search?: string;
  }) {
    const { page, limit, endpoint, country, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (endpoint) {
      where.endpoint = endpoint;
    }

    if (country) {
      where.country = country;
    }

    if (search) {
      where.OR = [
        { ip: { contains: search, mode: 'insensitive' } },
        { endpoint: { contains: search, mode: 'insensitive' } },
        { userId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [violations, total] = await Promise.all([
      this.prisma.rateLimitViolation.findMany({
        where,
        orderBy: {
          violatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.rateLimitViolation.count({ where }),
    ]);

    return {
      violations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMetrics(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const metrics = await this.prisma.rateLimitMetrics.findMany({
      where: {
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Also get real-time data from violations table
    const dailyViolations = await this.prisma.rateLimitViolation.groupBy({
      by: ['violatedAt'],
      where: {
        violatedAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // Group by date
    const violationsByDate: Record<string, number> = {};
    dailyViolations.forEach((v) => {
      const date = new Date(v.violatedAt);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      violationsByDate[dateKey] =
        (violationsByDate[dateKey] || 0) + v._count.id;
    });

    return {
      metrics,
      dailyViolations: violationsByDate,
    };
  }

  async getTopViolators(type: 'ip' | 'user' = 'ip', limit: number = 10) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (type === 'ip') {
      const topIPs = await this.prisma.rateLimitViolation.groupBy({
        by: ['ip', 'country', 'city'],
        where: {
          violatedAt: {
            gte: yesterday,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit,
      });

      return topIPs.map((item) => ({
        ip: item.ip,
        country: item.country,
        city: item.city,
        violations: item._count.id,
      }));
    } else {
      const topUsers = await this.prisma.rateLimitViolation.groupBy({
        by: ['userId'],
        where: {
          violatedAt: {
            gte: yesterday,
          },
          userId: {
            not: null,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit,
      });

      return topUsers.map((item) => ({
        userId: item.userId,
        violations: item._count.id,
      }));
    }
  }

  async getGeographicDistribution() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 7);

    const countries = await this.prisma.rateLimitViolation.groupBy({
      by: ['country'],
      where: {
        violatedAt: {
          gte: yesterday,
        },
        country: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 20,
    });

    return countries.map((item) => ({
      country: item.country,
      violations: item._count.id,
    }));
  }
}
