import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Calendar } from './calendar.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Calendar)
    private calendarRepository: Repository<Calendar>,
  ) {}

  async findAll(): Promise<Calendar[]> {
    return this.calendarRepository.find();
  }

  async findById(id: string): Promise<Calendar> {
    const calendar = await this.calendarRepository.findOne({
      where: { service_id: id },
    });
    if (!calendar) {
      throw new NotFoundException(`Calendar with service ID ${id} not found`);
    }
    return calendar;
  }

  async findByIds(ids: string[]): Promise<Calendar[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    return this.calendarRepository.find({
      where: { service_id: In(ids) },
    });
  }

  async create(calendar: Calendar): Promise<Calendar> {
    const newCalendar = this.calendarRepository.create(calendar);
    return this.calendarRepository.save(newCalendar);
  }

  async update(id: string, calendar: Calendar): Promise<Calendar> {
    const existingCalendar = await this.findById(id);
    const updatedCalendar = this.calendarRepository.merge(
      existingCalendar,
      calendar,
    );
    return this.calendarRepository.save(updatedCalendar);
  }
}
