import { Test } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { User } from 'src/auth/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from './task-status.enum';
import { NotFoundException } from '@nestjs/common';

const tasks: Task[] = [];

const mockTasksRepository = () => ({
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockReturnThis().mockResolvedValue(tasks),
  })),
  create: jest.fn(),
  delete: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

const mockUser: User = {
  username: 'Test',
  id: 'testId',
  password: 'testPassword',
  tasks: [],
};

const TASK_REPOSITORY_TOKEN = getRepositoryToken(Task);

describe('TasksService', () => {
  let tasksService: TasksService;
  let tasksRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TASK_REPOSITORY_TOKEN, useFactory: mockTasksRepository },
      ],
    }).compile();

    tasksService = module.get(TasksService);
    tasksRepository = module.get<Repository<Task>>(TASK_REPOSITORY_TOKEN);
  });

  it('Task Service should be defined', () => {
    expect(tasksService).toBeDefined();
  });

  it('Task Repository should be defined', () => {
    expect(tasksRepository).toBeDefined();
  });

  describe('Create Task', () => {
    it('TaskService.createTask()should create a new task and return the new task', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'new test task title',
        description: 'new test task description',
      };
      const newTask: Task = {
        id: 'secondTestId',
        status: TaskStatus.OPEN,
        user: mockUser,
        ...createTaskDto,
      };
      tasksRepository.create.mockResolvedValue({
        id: 'secondTestId',
        status: TaskStatus.OPEN,
        user: mockUser,
        ...createTaskDto,
      });
      const result = await tasksService.createTask(createTaskDto, mockUser);
      tasks.push(result);
      expect(JSON.stringify(result)).toEqual(JSON.stringify(newTask));
    });
  });
  describe('Get Tasks', () => {
    it('TasksService.getTasks() should return 1 task in the tasks array after creating a new task', async () => {
      const result = await tasksService.getTasks({}, mockUser);
      expect(result.length).toEqual(1);
    });

    it('TasksService.getTasks() should return an array of a task(s)', async () => {
      const result = await tasksService.getTasks({}, mockUser);
      expect(result).toEqual(tasks);
    });
  });

  describe('Get Task By ID', () => {
    it('TasksService.getTaskById() should return a single task given a valid taskId', async () => {
      tasksRepository.findOne.mockResolvedValue(tasks[0]);
      const result = await tasksService.getTaskById(tasks[0].id, mockUser);
      expect(result).toEqual(tasks[0]);
    });

    it('TasksService.getTaskById() should return a NotFoundException given an invalid taskId', () => {
      tasksRepository.findOne.mockResolvedValue(null);
      const result = tasksService.getTaskById('someRandomId', mockUser);
      expect(result).rejects.toThrow(NotFoundException);
    });
  });

  describe('Update Task', () => {
    it('TaskService.updateStatus() should update the task status and return the updated task, only if given a valid taskId', async () => {
      tasksRepository.findOne.mockResolvedValue(tasks[0]);

      const result = await tasksService.updateTaskStatus(
        tasks[0].id,
        TaskStatus.DONE,
        mockUser,
      );
      expect(result.status).toEqual(TaskStatus.DONE);
    });
  });

  describe('Delete Task', () => {
    it('TaskService.deleteTask() should delete a task and result in a 200 status code', async () => {
      tasksRepository.delete.mockResolvedValue({ affected: 1 });
      const result = tasksService.deleteTask(tasks[0].id, mockUser);
      expect(result).resolves.toBe('Task deleted');
    });

    it('TaskService.deleteTask() should return a NotFoundException given an invalid taskId', () => {
      tasksRepository.delete.mockResolvedValue({ affected: 0 });
      const result = tasksService.deleteTask('someRandomId', mockUser);
      expect(result).rejects.toThrow(NotFoundException);
    });
  });
});
