import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksFilterDto } from './dto/get-task-filter.dto';
import { TaskStatus } from './task-status.enum';
import { Task } from './task.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  async createTask(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    try {
      const { title, description } = createTaskDto;

      const task = this.tasksRepository.create({
        title,
        description,
        status: TaskStatus.OPEN,
        user,
      });

      await this.tasksRepository.save(task);

      return task;
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async getTasks(filterDto: GetTasksFilterDto, user: User): Promise<Task[]> {
    try {
      const { status, search } = filterDto;

      const query = this.tasksRepository.createQueryBuilder('task');
      query.where({ user });

      if (status) {
        query.andWhere('task.status = :status', { status });
      }

      if (search) {
        query.andWhere(
          '(task.title ILIKE :search OR task.description ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      const tasks = await query.getMany();

      return tasks;
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async getTaskById(id: string, user: User): Promise<Task> {
    try {
      const task = await this.tasksRepository.findOne({ where: { id, user } });

      if (!task) {
        throw new NotFoundException(`Task with ID "${id}" not found`);
      }

      return task;
    } catch (error) {
      if (error.code === '22P02') {
        throw new NotFoundException('Invalid task ID');
      } else if (error.status === 404) {
        throw new NotFoundException(`Task with ID "${id}" not found`);
      }
      throw new InternalServerErrorException();
    }
  }

  async updateTaskStatus(
    id: string,
    status: TaskStatus,
    user: User,
  ): Promise<Task> {
    try {
      const task = await this.getTaskById(id, user);
      task.status = status;
      await this.tasksRepository.save(task);
      return task;
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async deleteTask(id: string, user: User): Promise<string> {
    try {
      const deleted = await this.tasksRepository.delete({ id, user });

      if (!deleted.affected) {
        throw new NotFoundException();
      }
      return 'Task deleted';
    } catch (error) {
      if (error.code === '22P02') {
        throw new NotFoundException('Invalid task ID');
      } else if (error.status === 404) {
        throw new NotFoundException(`Task with ID "${id}" not found`);
      }
      throw new InternalServerErrorException();
    }
  }
}
