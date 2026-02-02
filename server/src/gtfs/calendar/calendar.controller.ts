import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Calendar } from './calendar.entity';
import { CalendarService } from './calendar.service';

@ApiTags('Calendar')
@Controller('gtfs/calendar')
export class CalendarController {
  constructor(private readonly calendarsService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Get all calendars' })
  @ApiResponse({
    status: 200,
    description: 'Returns all calendars',
    type: [Calendar],
  })
  findAll(): Promise<Calendar[]> {
    return this.calendarsService.findAll();
  }

  @Get('bulk')
  @ApiOperation({ summary: 'Get calendars by service IDs' })
  @ApiQuery({
    name: 'ids',
    required: true,
    description: 'Comma-separated list of service IDs',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns calendars for the given service IDs',
    type: [Calendar],
  })
  findBulk(@Query('ids') ids: string): Promise<Calendar[]> {
    const serviceIds = ids.split(',').filter(Boolean);
    return this.calendarsService.findByIds(serviceIds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get calendar by service ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the calendar',
    type: Calendar,
  })
  @ApiResponse({ status: 404, description: 'Calendar not found' })
  findById(@Param('id') id: string): Promise<Calendar> {
    return this.calendarsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new calendar' })
  @ApiResponse({
    status: 201,
    description: 'Calendar created successfully',
    type: Calendar,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() calendar: Calendar): Promise<Calendar> {
    return this.calendarsService.create(calendar);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update calendar by service ID' })
  @ApiResponse({
    status: 200,
    description: 'Calendar updated successfully',
    type: Calendar,
  })
  @ApiResponse({ status: 404, description: 'Calendar not found' })
  update(
    @Param('id') id: string,
    @Body() calendar: Calendar,
  ): Promise<Calendar> {
    return this.calendarsService.update(id, calendar);
  }
}
