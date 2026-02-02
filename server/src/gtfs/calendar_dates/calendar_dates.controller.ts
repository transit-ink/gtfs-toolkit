import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CalendarDate } from './calendar-date.entity';
import { CalendarDatesService } from './calendar_dates.service';

@ApiTags('Calendar Dates')
@Controller('gtfs/calendar_dates')
export class CalendarDatesController {
  constructor(private readonly calendarDatesService: CalendarDatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all calendar dates' })
  @ApiResponse({
    status: 200,
    description: 'Returns all calendar dates',
    type: [CalendarDate],
  })
  findAll(): Promise<CalendarDate[]> {
    return this.calendarDatesService.findAll();
  }

  @Get(':serviceId')
  @ApiOperation({ summary: 'Get calendar dates by service ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the calendar dates',
    type: [CalendarDate],
  })
  findByServiceId(
    @Param('serviceId') serviceId: string,
  ): Promise<CalendarDate[]> {
    return this.calendarDatesService.findByServiceId(serviceId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new calendar date' })
  @ApiResponse({
    status: 201,
    description: 'Calendar date created successfully',
    type: CalendarDate,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() calendarDate: CalendarDate): Promise<CalendarDate> {
    return this.calendarDatesService.create(calendarDate);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update calendar date by ID' })
  @ApiResponse({
    status: 200,
    description: 'Calendar date updated successfully',
    type: CalendarDate,
  })
  @ApiResponse({ status: 404, description: 'Calendar date not found' })
  update(
    @Param('id') id: string,
    @Body() calendarDate: CalendarDate,
  ): Promise<CalendarDate> {
    return this.calendarDatesService.update(id, calendarDate);
  }
}
