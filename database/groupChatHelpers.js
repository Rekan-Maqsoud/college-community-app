import { createGroupChat, CHAT_TYPES } from './chats';

export const createStageGroupChat = async (department, stage, stageName) => {
    try {
        const chatName = `${stageName} - ${department}`;
        
        const stageValue = typeof stage === 'number' ? String(stage) : stage;
        
        const chat = await createGroupChat({
            name: chatName,
            type: CHAT_TYPES.STAGE_GROUP,
            department: department,
            stage: stageValue,
            requiresRepresentative: true,
            representatives: [],
            description: `Group chat for ${stageName} students in ${department}`,
        });
        
        return chat;
    } catch (error) {
        throw error;
    }
};

export const createDepartmentGroupChat = async (department) => {
    try {
        const chatName = `${department} - All Stages`;
        
        const chat = await createGroupChat({
            name: chatName,
            type: CHAT_TYPES.DEPARTMENT_GROUP,
            department: department,
            requiresRepresentative: false,
            representatives: [],
            description: `Group chat for all students in ${department}`,
        });
        
        return chat;
    } catch (error) {
        throw error;
    }
};

export const initializeGroupChatsForDepartment = async (department, stages) => {
    try {
        const createdChats = [];
        
        const departmentChat = await createDepartmentGroupChat(department);
        createdChats.push(departmentChat);
        
        for (const stage of stages) {
            const stageChat = await createStageGroupChat(
                department, 
                stage.value, 
                stage.label
            );
            createdChats.push(stageChat);
        }
        
        return createdChats;
    } catch (error) {
        throw error;
    }
};
